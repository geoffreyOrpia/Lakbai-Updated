import { haversineKm } from "../utils/geo.jsx";
import { edgeSupportsMode } from "./graph.jsx";
import { routingProfile } from "./routingProfiles.jsx";

import { nodePassageAllowed } from "./accessRules.jsx";
import { advanceTurnState, normalizeTurnState } from "./turnRestrictions.jsx";

class MinHeap {
  items = [];

  push(item) {
    this.items.push(item);
    let index = this.items.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.items[parent].priority <= item.priority) break;
      this.items[index] = this.items[parent];
      index = parent;
    }
    this.items[index] = item;
  }

  pop() {
    if (!this.items.length) return null;
    const root = this.items[0];
    const last = this.items.pop();
    if (!this.items.length) return root;

    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      if (left >= this.items.length) break;
      let child = left;
      if (right < this.items.length && this.items[right].priority < this.items[left].priority) {
        child = right;
      }
      if (this.items[child].priority >= last.priority) break;
      this.items[index] = this.items[child];
      index = child;
    }
    this.items[index] = last;
    return root;
  }

  get size() {
    return this.items.length;
  }
}

const reconstruct = (cameFrom, current, endId) => {
  const nodes = [endId];
  const edges = [];
  while (cameFrom.has(current)) {
    const step = cameFrom.get(current);
    edges.push(step.edge);
    nodes.push(step.edge.from);
    current = step.previous;
  }
  nodes.reverse();
  edges.reverse();
  return { nodes, edges };
};

export const aStarRoute = (
  index,
  startId,
  endId,
  mode = 'walk',
  preference = 'direct',
  context = {},
) => {
  const start = String(startId);
  const end = String(endId);
  if (!index.nodesById.has(start) || !index.nodesById.has(end)) return null;
  if (start === end) return { nodeIds: [start], edges: [], cost: 0 };

  const profile = routingProfile(mode, preference, context);
  const frontier = new MinHeap();
  const cameFrom = new Map();
  const costSoFar = new Map();
  const endNode = index.nodesById.get(end);

  const turnPolicy = index.turnPolicy?.[mode];
  const hasTurns = Boolean(turnPolicy?.patterns.length);
  const initialActive = hasTurns
    ? normalizeTurnState(turnPolicy, context.initialTurnState)
    : [];
  const startKey = initialActive.length
    ? JSON.stringify([start, initialActive])
    : start;
  costSoFar.set(startKey, 0);
  frontier.push({ id: start, key: startKey, active: initialActive, cost: 0, priority: 0 });

  while (frontier.size) {
    const current = frontier.pop();
    if (current.cost !== costSoFar.get(current.key)) continue;
    if (current.id === end) {
      const path = reconstruct(cameFrom, current.key, end);
      return {
        nodeIds: path.nodes,
        edges: path.edges,
        cost: current.cost,
      };
    }

    if (!nodePassageAllowed(index.nodesById.get(current.id), mode)) continue;
    const currentCost = current.cost;
    for (const edge of index.adjacency.get(current.id) ?? []) {
      if (!edgeSupportsMode(edge, mode)) continue;
      const active = hasTurns ? advanceTurnState(turnPolicy, current.active, edge._turnKey) : [];
      if (active === null) continue;
      const key = active.length ? JSON.stringify([edge.to, active]) : edge.to;
      const nextCost = currentCost + profile.edgeCost(edge);
      if (nextCost >= (costSoFar.get(key) ?? Number.POSITIVE_INFINITY)) continue;

      costSoFar.set(key, nextCost);
      cameFrom.set(key, {
        previous: current.key,
        edge,
      });
      const nextNode = index.nodesById.get(edge.to);
      const heuristic = profile.heuristicHours(haversineKm(nextNode, endNode));
      frontier.push({
        id: edge.to, key, active, cost: nextCost,
        priority: nextCost + heuristic,
      });
    }
  }

  return null;
};
