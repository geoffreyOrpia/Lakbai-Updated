import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mapsDir = resolve(root, 'assets', 'maps');
const output = resolve(mapsDir, 'davao-del-norte.pmtiles');
const temporary = `${output}.tmp`;
const registry = resolve(root, 'src', 'data', 'assets', 'offlineBasemapAsset.jsx');

const source = process.env.LAKBAYLOKAL_PMTILES_SOURCE
  ?? 'https://build.protomaps.com/20260925.pmtiles';
const bbox = process.env.LAKBAYLOKAL_PMTILES_BBOX
  ?? '125.305271,6.894583,125.92785,8.000306';
const maxzoom = process.env.LAKBAYLOKAL_PMTILES_MAXZOOM ?? '13';

mkdirSync(mapsDir, { recursive: true });
rmSync(temporary, { force: true });

console.log('Preparing the Davao del Norte offline vector basemap...');
console.log(`Source: ${source}`);
console.log(`Bounds: ${bbox} · max zoom: ${maxzoom}`);

const result = spawnSync('pmtiles', [
  'extract',
  source,
  temporary,
  `--bbox=${bbox}`,
  `--maxzoom=${maxzoom}`,
], {
  cwd: root,
  stdio: 'inherit',
});

if (result.error?.code === 'ENOENT' || result.status === 127 || result.status === 9009) {
  rmSync(temporary, { force: true });
  console.error('\nPMTiles CLI was not found on PATH.');
  console.error('Install the official PMTiles CLI, reopen the terminal, then run npm run maps:prepare again.');
  process.exit(1);
}

if (result.error || result.status !== 0) {
  rmSync(temporary, { force: true });
  console.error('\nPMTiles extraction failed. The existing app map setup was left unchanged.');
  process.exit(result.status || 1);
}

rmSync(output, { force: true });
renameSync(temporary, output);

const registrySource = `export const OFFLINE_BASEMAP_META = Object.freeze({
  region: 'Davao del Norte',
  source: '${source}',
  bounds: [125.305271, 6.894583, 125.92785, 8.000306],
  maxzoom: ${Number(maxzoom)},
  attribution: '© OpenStreetMap contributors · Protomaps',
});

export const getOfflineBasemapModule = () => require('../../../assets/maps/davao-del-norte.pmtiles');
`;

writeFileSync(registry, registrySource, 'utf8');
console.log('\nOffline basemap prepared: assets/maps/davao-del-norte.pmtiles');
console.log('Restart Metro with --clear after generating the file for the first time.');
