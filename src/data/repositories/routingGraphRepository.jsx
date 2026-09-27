import { File } from 'expo-file-system';
import { getBundledRoutingGraph } from "../assets/routingGraphs.jsx";

const defaultReadText = uri => new File(uri).textSync();

export class BundledRoutingGraphRepository {
  constructor(readText = defaultReadText) {
    this.readText = readText;
  }

  getForDestination = async (destinationId, savedGraphUri = null) => {
    if (savedGraphUri) {
      try {
        const savedGraph = JSON.parse(this.readText(savedGraphUri));
        if (savedGraph?.nodes?.length && savedGraph?.edges?.length) {
          return savedGraph;
        }
      } catch {
        // Corrupt or missing saved data falls back to a bundled pilot graph.
      }
    }
    return getBundledRoutingGraph(destinationId);
  };
}
