import { BundledRoutingGraphRepository } from '../src/data/repositories/routingGraphRepository.jsx';

describe('BundledRoutingGraphRepository', () => {
  test('prefers a valid routing graph saved with the destination pack', async () => {
    const saved = {
      meta: { id: 'saved-panabo' },
      nodes: [
        { id: 'a', lat: 7.2, lng: 125.6 },
        { id: 'b', lat: 7.21, lng: 125.61 },
      ],
      edges: [
        { from: 'a', to: 'b', distanceKm: 1, walk: true },
      ],
    };
    const readText = jest.fn().mockReturnValue(JSON.stringify(saved));
    const repository = new BundledRoutingGraphRepository(readText);

    await expect(repository.getForDestination(
      'panabo',
      'file:///packs/panabo/routing.graph.json',
    )).resolves.toEqual(saved);
    expect(readText).toHaveBeenCalledWith('file:///packs/panabo/routing.graph.json');
  });

  test('falls back to the bundled graph when the saved graph cannot be read', async () => {
    const repository = new BundledRoutingGraphRepository(() => {
      throw new Error('missing file');
    });

    const graph = await repository.getForDestination(
      'panabo',
      'file:///packs/panabo/routing.graph.json',
    );

    expect(graph.meta.id).toBe('panabo-routing-pilot');
    expect(graph.nodes.length).toBeGreaterThan(10000);
  });

  test('returns null when neither a saved nor bundled graph exists', async () => {
    const repository = new BundledRoutingGraphRepository(() => '{}');

    await expect(repository.getForDestination(
      'tagum',
      'file:///packs/tagum/routing.graph.json',
    )).resolves.toBeNull();
  });
});
