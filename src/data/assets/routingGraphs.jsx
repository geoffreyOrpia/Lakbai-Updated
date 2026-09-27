let panaboGraphCache = null;

const loadPanaboGraph = () => {
  if (!panaboGraphCache) {
    panaboGraphCache = require('./panaboRoutingGraph.json');
  }
  return panaboGraphCache;
};

const loaders = Object.freeze({
  panabo: loadPanaboGraph,
});

export const getBundledRoutingGraph = destinationId => {
  return loaders[destinationId]?.() ?? null;
};

export const hasBundledRoutingGraph = destinationId => Boolean(loaders[destinationId]);
