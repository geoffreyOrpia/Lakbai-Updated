import { haversineKm } from "../utils/geo.jsx";
import { edgeSupportsMode } from "./graph.jsx";
import { routingProfile } from "./routingProfiles.jsx";

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

const reconstruct = (cameFrom, current) => {
  const nodes = [current];
  const edges = [];
  while (cameFrom.has(current)) {
    const step = cameFrom.get(current);
    edges.push(step.edge);
    current = step.from;
    nodes.push(current);
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
) => {
  const start = String(startId);
  const end = String(endId);
  if (!index.nodesById.has(start) || !index.nodesById.has(end)) return null;
  if (start === end) return { nodeIds: [start], edges: [], cost: 0 };

  const profile = routingProfile(mode, preference);
  const frontier = new MinHeap();
  const cameFrom = new Map();
  const costSoFar = new Map([[start, 0]]);
  const endNode = index.nodesById.get(end);

  frontier.push({ id: start, priority: 0 });

  while (frontier.size) {
    const current = frontier.pop();
    if (current.id === end) {
      const path = reconstruct(cameFrom, end);
      return {
        nodeIds: path.nodes,
        edges: path.edges,
        cost: costSoFar.get(end),
      };
    }

    const currentCost = costSoFar.get(current.id);
    for (const edge of index.adjacency.get(current.id) ?? []) {
      if (!edgeSupportsMode(edge, mode)) continue;
      const nextCost = currentCost + profile.edgeCost(edge);
      if (nextCost >= (costSoFar.get(edge.to) ?? Number.POSITIVE_INFINITY)) continue;

      costSoFar.set(edge.to, nextCost);
      cameFrom.set(edge.to, {
        from: current.id,
        edge,
      });
      const nextNode = index.nodesById.get(edge.to);
      const heuristic = profile.heuristicHours(haversineKm(nextNode, endNode));
      frontier.push({
        id: edge.to,
        priority: nextCost + heuristic,
      });
    }
  }

  return null;
};
