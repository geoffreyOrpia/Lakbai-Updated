import { validateCompactRoutingGraph } from '../../core/routing/compactGraph.jsx';
import { File } from 'expo-file-system';
import { getBundledRoutingGraph } from '../assets/routingGraphs.jsx';
import { routingRegionFor } from '../assets/routingRegionAssets.jsx';
import { sharedRoutingStorage } from '../services/sharedRoutingStorage.jsx';

const defaultReadText = uri => new File(uri).text();
export class BundledRoutingGraphRepository {
  constructor(readText = defaultReadText, sharedStorage = sharedRoutingStorage) {
    this.readText = readText;
    this.sharedStorage = sharedStorage;
    this.cache = new Map();
    this.inFlight = new Map();
    this.maxCachedGraphs = 2;
  }

  rememberGraph = (uri, graph) => {
    this.cache.delete(uri);
    this.cache.set(uri, graph);
    while (this.cache.size > this.maxCachedGraphs) {
      this.cache.delete(this.cache.keys().next().value);
    }
  };

  readGraph = async (uri, region = null) => {
    const cached = this.cache.get(uri);
    if (cached) {
      if (region && cached.meta?.regionId !== region) throw new Error('Routing region mismatch');
      this.rememberGraph(uri, cached);
      return cached;
    }
    let task = this.inFlight.get(uri);
    if (!task) {
      task = (async () => {
        const text = await this.readText(uri);
        // Let the loading UI paint after native file I/O before the large JSON parse.
        await new Promise(resolve => setTimeout(resolve, 0));
        const parsed = JSON.parse(text);
        if (!parsed?.nodes?.length || !parsed?.edges?.length) throw new Error('Empty routing graph');
        if (parsed.format) validateCompactRoutingGraph(parsed);
        return parsed;
      })();
      this.inFlight.set(uri, task);
      task.finally(() => {
        if (this.inFlight.get(uri) === task) this.inFlight.delete(uri);
      }).catch(() => {});
    }
    const graph = await task;
    if (region && graph.meta?.regionId !== region) throw new Error('Routing region mismatch');
    this.rememberGraph(uri, graph);
    return graph;
  };

  getForRegion = async (region, savedGraphUri = null, savedReference = null) => {
    if (!region) return null;
    if (savedGraphUri && !savedGraphUri.endsWith('.routing')) {
      try { return await this.readGraph(savedGraphUri); } catch { /* Retry current bundled region. */ }
    }
    try {
      const saved = await this.sharedStorage.ensure(region);
      return await this.readGraph(saved.uri, region);
    } catch {
      if (savedReference) {
        try {
          const previous = this.sharedStorage.status(region, savedReference);
          if (previous && previous.uri === savedGraphUri) return await this.readGraph(previous.uri, region);
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
      try { return await this.readGraph(savedGraphUri); } catch { /* Retry current bundled region. */ }
    }
    if (region) {
      const graph = await this.getForRegion(region, savedGraphUri, savedReference);
      if (graph) return graph;
      if (savedGraphUri?.endsWith('.routing')) return null;
    }
    return getBundledRoutingGraph(destinationId);
  };
}
