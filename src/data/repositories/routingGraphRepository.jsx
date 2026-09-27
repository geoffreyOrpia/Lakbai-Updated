let panaboGraphCache = null;

const loadPanaboGraph = () => {
  if (!panaboGraphCache) {
    panaboGraphCache = require('../assets/panaboRoutingGraph.json');
  }
  return panaboGraphCache;
};

export class BundledRoutingGraphRepository {
  getForDestination = async destinationId => {
    if (destinationId === 'panabo') return loadPanaboGraph();
    return null;
  };
}
