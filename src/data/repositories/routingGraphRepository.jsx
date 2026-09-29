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
    this.cache = new Map();
    this.maxCachedGraphs = 2;
  }

  rememberGraph = (uri, graph) => {
    this.cache.delete(uri);
    this.cache.set(uri, graph);
    while (this.cache.size > this.maxCachedGraphs) {
      this.cache.delete(this.cache.keys().next().value);
    }
  };

  readGraph = (uri, region = null) => {
    const cached = this.cache.get(uri);
    if (cached) {
      if (region && cached.meta?.regionId !== region) throw new Error('Routing region mismatch');
      this.rememberGraph(uri, cached);
      return cached;
    }
    const graph = JSON.parse(this.readText(uri));
    if (!graph?.nodes?.length || !graph?.edges?.length) throw new Error('Empty routing graph');
    if (graph.format) validateCompactRoutingGraph(graph);
    if (region && graph.meta?.regionId !== region) throw new Error('Routing region mismatch');
    this.rememberGraph(uri, graph);
    return graph;
  };

  getForRegion = async (region, savedGraphUri = null, savedReference = null) => {
    if (!region) return null;
    if (savedGraphUri && !savedGraphUri.endsWith('.routing')) {
      try { return this.readGraph(savedGraphUri); } catch { /* Retry current bundled region. */ }
    }
    try {
      const saved = await this.sharedStorage.ensure(region);
      return this.readGraph(saved.uri, region);
    } catch {
      if (savedReference) {
        try {
          const previous = this.sharedStorage.status(region, savedReference);
          if (previous && previous.uri === savedGraphUri) return this.readGraph(previous.uri, region);
        } catch { /* A damaged previous copy cannot be used. */ }
      }
      if (savedGraphUri?.endsWith('.routing')) return null;
    }
    return null;
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
      const graph = await this.getForRegion(region, savedGraphUri, savedReference);
      if (graph) return graph;
      if (savedGraphUri?.endsWith('.routing')) return null;
    }
    return getBundledRoutingGraph(destinationId);
  };
}
