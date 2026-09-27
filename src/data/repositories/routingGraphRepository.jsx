export class BundledRoutingGraphRepository {
  getForDestination = async destinationId => {
    if (destinationId === 'panabo') {
      return require('../assets/panaboRoutingGraph.json');
    }
    return null;
  };
}
