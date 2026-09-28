import { modeAccessKeys } from './accessRules.jsx';

const VALUES = new Set(['no_left_turn', 'no_right_turn', 'no_u_turn', 'no_straight_on', 'no_entry', 'no_exit',
  'only_left_turn', 'only_right_turn', 'only_straight_on', 'only_u_turn']);
const wayId = edge => String(edge.osmId ?? '');
const reverseOf = (a, b) => a.from === b.to && a.to === b.from
  && (a.segmentId || b.segmentId ? a.segmentId === b.segmentId : wayId(a) === wayId(b));

const restrictionsForMode = (tags, mode) => {
  const modes = modeAccessKeys(mode);
  const exceptions = String(tags.except ?? '').split(';').map(item => item.trim());
  if (modes.some(item => exceptions.includes(item))) return [];
  const typeMode = String(tags.type ?? '').split(':')[1];
  if (typeMode && !modes.includes(typeMode)) return [];
  const keys = [...modes.map(item => 'restriction:' + item)];
  if (mode === 'drive' || typeMode === 'foot') keys.push('restriction');
  for (const key of keys) {
    if (tags[key] || tags[key + ':conditional']) {
      const result = [];
      if (tags[key]) result.push({ value: tags[key], conditional: false });
      if (tags[key + ':conditional']) {
        // Enforce every recognizable restricted movement all day. Do not infer
        // that an offline user is entitled to a time/vehicle-specific exception.
        const parts = String(tags[key + ':conditional']).match(/(?:no|only)_[a-z_]+\s*(?=@)/g) ?? [];
        for (const part of parts) result.push({ value: part.trim(), conditional: true });
        if (!parts.length) result.push({ value: 'unsupported-conditional', conditional: true });
      }
      return result;
    }
  }
  return [];
};

// Compile OSM relations to directed edge sequences. Virtual start/end edges
// retain _turnKey, so clipping a road cannot bypass a turn restriction.
export const buildTurnPolicy = (graph, nodesById, adjacency) => {
  if (!graph.turnRestrictions?.length) return {
    walk: { patterns: [], starts: new Map() }, drive: { patterns: [], starts: new Map() },
    summary: { relations: 0, compiled: { walk: 0, drive: 0 }, conservativeConditional: [], unresolved: [] },
  };
  const byWay = new Map();
  for (const outgoing of adjacency.values()) for (const edge of outgoing) {
    const id = wayId(edge);
    if (!byWay.has(id)) byWay.set(id, []);
    byWay.get(id).push(edge);
  }
  const summary = { relations: (graph.turnRestrictions ?? []).length, compiled: { walk: 0, drive: 0 },
    conservativeConditional: [], unresolved: [] };
  const policies = {};
  for (const mode of ['walk', 'drive']) {
    const patterns = [];
    const starts = new Map();
    for (const relation of graph.turnRestrictions ?? []) {
      for (const rule of restrictionsForMode(relation.tags ?? {}, mode)) {
        const unresolved = reason => summary.unresolved.push({ id: relation.id, mode, reason });
        if (!VALUES.has(rule.value)) { unresolved('unsupported restriction value: ' + rule.value); continue; }
        const members = relation.members ?? [];
        const from = members.filter(item => item.role === 'from' && item.type === 'w').map(item => String(item.ref));
        const to = members.filter(item => item.role === 'to' && item.type === 'w').map(item => String(item.ref));
        const via = members.filter(item => item.role === 'via');
        const nodeVia = via.length === 1 && via[0].type === 'n';
        if (!from.length || !to.length || !via.length || (!nodeVia && via.some(item => item.type !== 'w'))
          || (from.length > 1 && rule.value !== 'no_entry') || (to.length > 1 && rule.value !== 'no_exit')) {
          unresolved('incomplete or unsupported relation members'); continue;
        }
        const paths = [];
        let exceeded = false;
        let visits = 0;
        const appendTargets = (node, prefix) => {
          for (const edge of adjacency.get(node) ?? []) {
            if (!to.includes(wayId(edge))) continue;
            const incoming = prefix[0];
            if (nodeVia && wayId(incoming) === wayId(edge)) {
              const uTurn = rule.value === 'no_u_turn' || rule.value === 'only_u_turn';
              if (reverseOf(incoming, edge) !== uTurn) continue;
            }
            paths.push([...prefix, edge].map(item => item._turnKey));
            if (paths.length > 256) exceeded = true;
          }
        };
        const followVia = (node, stage, prefix, visited) => {
          if (++visits > 10000 || prefix.length > 256 || exceeded) { exceeded = true; return; }
          for (const edge of adjacency.get(node) ?? []) {
            if (wayId(edge) !== String(via[stage].ref) || visited.has(edge.to)) continue;
            const next = [...prefix, edge];
            const seen = new Set(visited).add(edge.to);
            if (stage === via.length - 1) appendTargets(edge.to, next);
            else followVia(edge.to, stage + 1, next, new Set([edge.to]));
            followVia(edge.to, stage, next, seen);
          }
        };
        for (const id of from) for (const edge of byWay.get(id) ?? []) {
          if (nodeVia) {
            const osmNode = 'osm:' + via[0].ref;
            const viaId = nodesById.has(osmNode) ? osmNode : String(via[0].ref);
            if (edge.to === viaId) appendTargets(edge.to, [edge]);
          } else followVia(edge.to, 0, [edge], new Set([edge.to]));
        }
        if (exceeded || !paths.length) {
          unresolved(exceeded ? 'relation path exceeds compilation limit' : 'no connected relation path in graph'); continue;
        }
        const group = patterns.length;
        for (const path of new Map(paths.map(item => [item.join(','), item])).values()) {
          const id = patterns.length;
          patterns.push({ path, only: rule.value.startsWith('only_'), group });
          const bucket = starts.get(path[0]) ?? [];
          bucket.push([id, 1]);
          starts.set(path[0], bucket);
        }
        summary.compiled[mode] += 1;
        if (rule.conditional) summary.conservativeConditional.push({ id: relation.id, mode, value: rule.value });
      }
    }
    policies[mode] = { patterns, starts };
  }
  return { ...policies, summary };
};

export const advanceTurnState = (policy, active, edgeKey) => {
  const required = new Set();
  const satisfied = new Set();
  const next = [];
  for (const [id, position] of active) {
    const pattern = policy.patterns[id];
    if (pattern.only) required.add(pattern.group);
    if (pattern.path[position] !== edgeKey) continue;
    if (pattern.only) satisfied.add(pattern.group);
    if (position + 1 === pattern.path.length) {
      if (!pattern.only) return null;
    } else next.push([id, position + 1]);
  }
  for (const group of required) if (!satisfied.has(group)) return null;
  next.push(...(policy.starts.get(edgeKey) ?? []));
  return [...new Map(next.map(item => [item.join(':'), item])).values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
};
