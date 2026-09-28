import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROUTING_MANIFEST } from '../src/data/assets/routingRegionAssets.jsx';
import { calculateOfflineRoute } from '../src/domain/usecases/offlineNavigation.jsx';

test.each(['mainland', 'samal'])('bundled %s asset matches its installed-file identity', region => {
  const entry = ROUTING_MANIFEST.regions[region];
  const bytes = fs.readFileSync(path.join(__dirname, '../src/data/assets/routing', entry.filename));
  expect(bytes.length).toBe(entry.bytes);
  expect(crypto.createHash('md5').update(bytes).digest('hex')).toBe(entry.md5);
  expect(crypto.createHash('sha256').update(bytes).digest('hex')).toBe(entry.sha256);
});

test('core routing rejects both directions of a mainland-island journey before snapping', () => {
  const mainland = { lat:7.4477, lng:125.8071 };
  const samal = { lat:7.1336203, lng:125.6847488 };
  for (const regionId of ['mainland', 'samal']) {
    const graph = { meta: { ...ROUTING_MANIFEST, regionId } };
    expect(calculateOfflineRoute({graph, from:mainland, to:samal}).reason).toBe('ferry-required');
    expect(calculateOfflineRoute({graph, from:samal, to:mainland}).reason).toBe('ferry-required');
    expect(calculateOfflineRoute({graph, from:mainland, to:{lat:14.6,lng:121}}).reason).toBe('outside-coverage');
  }
});
