describe('pack content manifest reads', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('lists manifest metadata without selecting or parsing full pack payloads', async () => {
    const getAllAsync = jest.fn().mockResolvedValue([{
      pack_id: 'samal',
      name: 'Samal Island',
      municipality: 'Samal',
      category: 'island',
      version: 8,
      updated_at: '2026-09-29T00:00:00.000Z',
      size_kb: 5,
      trails_count: 0,
      route_suggestions_count: 1,
      spots_count: 8,
      withheld_trails_count: 1,
    }]);
    const ensureBundledContent = jest.fn().mockResolvedValue({ getAllAsync });
    jest.doMock('../src/data/local/sqlite/database.jsx', () => ({ ensureBundledContent }));

    const { createPackContentDao } = require('../src/data/local/sqlite/packContentDao.jsx');
    const manifests = await createPackContentDao().listManifests();

    expect(getAllAsync).toHaveBeenCalledTimes(1);
    expect(getAllAsync.mock.calls[0][0]).not.toContain('payload_json');
    expect(manifests).toEqual([{
      id: 'samal',
      name: 'Samal Island',
      municipality: 'Samal',
      category: 'island',
      version: 8,
      updatedAt: '2026-09-29T00:00:00.000Z',
      sizeKb: 5,
      trailsCount: 0,
      routeSuggestionsCount: 1,
      spotsCount: 8,
      withheldTrailsCount: 1,
    }]);
  });
});
