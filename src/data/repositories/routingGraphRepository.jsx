import { validateCompactRoutingGraph } from '../../core/routing/compactGraph.jsx';
import { File } from 'expo-file-system';
import { getBundledRoutingGraph } from '../assets/routingGraphs.jsx';
import { routingRegionFor } from '../assets/routingRegionAssets.jsx';
import { sharedRoutingStorage } from '../services/sharedRoutingStorage.jsx';

const defaultReadText = uri => new File(uri).textSync();
export class BundledRoutingGraphRepository {
  constructor(readText = defaultReadText, sharedStorage = sharedRoutingStorage) {
    this.readText = readText;
    this.sharedStorage = sharedStorage;
    this.cached = null;
  }

  readGraph = (uri, region = null) => {
    if (this.cached?.uri === uri && (!region || this.cached.graph.meta?.regionId === region)) return this.cached.graph;
    const graph = JSON.parse(this.readText(uri));
    if (!graph?.nodes?.length || !graph?.edges?.length) throw new Error('Empty routing graph');
    if (graph.format) validateCompactRoutingGraph(graph);
    if (region && graph.meta?.regionId !== region) throw new Error('Routing region mismatch');
    // One graph retained by this repository; the engine index cache is weak.
    this.cached = { uri, graph };
    return graph;
  };

  getForDestination = async (destinationId, savedGraphUri = null, target = null, savedReference = null) => {
    const region = routingRegionFor(destinationId, target);
    if (target && !region) return null;
    // Older per-pack JSON graphs stay readable during migration. Newly saved
    // packs use checked shared files and never embed the provincial payload.
    if (savedGraphUri && !savedGraphUri.endsWith('.routing')) {
      try { return this.readGraph(savedGraphUri); } catch { /* Retry current bundled region. */ }
    }
    if (region) {
      try {
        const saved = await this.sharedStorage.ensure(region);
        return this.readGraph(saved.uri, region);
      } catch {
        // Current shared data must be checksum-validated by the store. Do not
        // trust an unchecked shared URI or silently replace it with pilot data.
        if (savedReference) {
          try {
            const previous = this.sharedStorage.status(region, savedReference);
            if (previous && previous.uri === savedGraphUri) return this.readGraph(previous.uri, region);
          } catch { /* A damaged previous copy cannot be used. */ }
        }
        if (savedGraphUri?.endsWith('.routing')) return null;
      }
    }
    return getBundledRoutingGraph(destinationId);
  };
}
