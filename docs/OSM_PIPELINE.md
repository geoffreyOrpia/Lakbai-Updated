# OSM source, import, and candidate validation

The province build uses a dated Geofabrik Philippines PBF. Keep the country source, regional GeoJSON lines, metadata sidecar, and candidate graph in `.tmp-routing/osm/` (ignored by Git). The country PBF is never an app asset.

## Source and dependencies

- Dataset page: https://download.geofabrik.de/asia/philippines.html
- Selected snapshot: https://download.geofabrik.de/asia/philippines-260927.osm.pbf
- Published checksum: https://download.geofabrik.de/asia/philippines-260927.osm.pbf.md5
- Data license: ODbL 1.0; attribution: OpenStreetMap contributors / Geofabrik.
- Pyosmium documentation: https://docs.osmcode.org/pyosmium/latest/
- Tag semantics: https://wiki.openstreetmap.org/wiki/Key:access and https://wiki.openstreetmap.org/wiki/Key:oneway

Verify the downloaded PBF against the published checksum. The importer also records a SHA-256 fingerprint and obtains the dataset timestamp from its PBF header. Use a dated snapshot instead of a moving `latest` URL when reproducing an audit.

Build-only dependencies, installed locally from the repository root:

```powershell
python -m pip install --target .tmp-routing/python --only-binary=:all: -r scripts/requirements-routing.txt
$env:PYTHONPATH = (Resolve-Path .tmp-routing/python).Path
```

These Python libraries are not mobile runtime dependencies.

## Extract, build, and audit

```powershell
python scripts/import-osm-roads.py --source=.tmp-routing/osm/philippines-260927.osm.pbf --output=.tmp-routing/osm/davao-del-norte-roads.geojsonl --source-url=https://download.geofabrik.de/asia/philippines-260927.osm.pbf

npm run routing:prepare:province -- --source=.tmp-routing/osm/davao-del-norte-roads.geojsonl --source-metadata=.tmp-routing/osm/davao-del-norte-roads.metadata.json --output=.tmp-routing/osm/davaoDelNorteRoutingGraph.json

python scripts/audit-routing-graph.py --graph=.tmp-routing/osm/davaoDelNorteRoutingGraph.json --output=docs/data/davao-del-norte-routing-audit.json

node --max-old-space-size=4096 scripts/audit-routing-runtime.cjs --graph=.tmp-routing/osm/davaoDelNorteRoutingGraph.json --report=docs/data/davao-del-norte-routing-audit.json
```

The extractor uses all bundled municipality polygons to derive the provincial extent, adds a configurable 2 km bounding-box buffer, and retains complete source road ways touching that area. Neighboring territory is included intentionally to retain boundary connections. This is not a precise administrative clip. The graph builder uses the metadata extent and verifies the GeoJSON checksum before reading it.

Each road retains all source coordinates, OSM way ID, OSM node IDs, and tags. Imported graphs compact shape-only nodes into edge polylines; shared junctions, tagged nodes, restriction via nodes, and loop connectivity remain explicit. Reverse edges store reversed coordinates. The raw GeoJSON still contains every source node reference. The sidecar stores tagged road nodes and restriction relations with member roles. Topology uses OSM node identity; separate bridge and ground-level nodes at identical coordinates are not merged. Existing HOT GeoJSON without OSM node IDs remains supported through the legacy coordinate-based path.

The builder applies basic mode access and directional rules, including mode-specific overrides, reverse one-way roads, roundabout driving direction, and explicit walking one-way tags. Private, customer-only, destination-only and conditional access are excluded conservatively from general through-routing. This may remove legitimate final-access roads; destination access needs separate modeling.

## Release limits

Generated data is an **unverified candidate**, not automatically registered or shipped. Road presence in all municipalities does not prove complete coverage. The graph retains turn restrictions and node barriers, but the current routing engine does not enforce those records. Ferry ways are excluded from the road network. Conditional restrictions and country-specific defaults need further work.

The geographic audit reports road-node counts, weak components, directed reachability between automatically selected anchors, source fingerprints, and graph size. Weak connectivity alone ignores travel direction. Anchors are test coordinates on the graph, not verified destination entrances. The runtime audit executes the actual JS routing engine on walking and driving samples within all 11 municipalities, representative mainland pairs, and a mainland-to-Samal pair. It checks the graph fingerprint and records the working-tree routing source fingerprints; this audit includes the pending navigation edits. Timing and memory are desktop measurements, not mobile performance claims.

Same-road snap matching now distinguishes imported segment IDs so parallel sections of one OSM way remain distinct. Do not activate the provincial candidate until restriction/barrier handling, shared storage, mobile memory and route latency, coverage failures, and real-device offline behavior have been addressed. Keep the shipped Panabo data available during that transition.

## Compact storage and memory audit

The provincial candidate also has a versioned `lakbai-routing-compact-v1` representation. It is **41,250,273 bytes instead of 141,555,528 bytes (70.9% smaller)**. The encoder stores node coordinates at OSM's seven-decimal precision, delta-encodes curve coordinates, shares geometry between travel directions, and shares road attributes. OSM node IDs, physical segment IDs, tags, modes, and restriction relations remain available. It does not simplify curves or join disconnected components.

At runtime, compact edges decode curve geometry only when used for snapping, maneuvers or route display. Walking and driving share spatial buckets with permission filtering at query time. Snapped routes use small overlays rather than copying the entire node and adjacency Maps. Legacy JSON packs remain supported. Saved compact packs validate table references, coordinates, modes and geometry endpoints before indexing; corrupt or unknown versions fall back through the existing repository.

Reproduce from the repository root after building the source graph:

```powershell
node --max-old-space-size=4096 scripts/compact-routing-graph.cjs --source=.tmp-routing/osm/davaoDelNorteRoutingGraph.json --output=.tmp-routing/osm/davaoDelNorteRoutingGraph.compact.json

node --expose-gc --max-old-space-size=4096 scripts/audit-routing-runtime.cjs --graph=.tmp-routing/osm/davaoDelNorteRoutingGraph.json --report=docs/data/davao-del-norte-routing-audit.json --output=.tmp-routing/osm/legacy-audit.json

node --expose-gc --max-old-space-size=4096 scripts/audit-routing-runtime.cjs --graph=.tmp-routing/osm/davaoDelNorteRoutingGraph.compact.json --report=docs/data/davao-del-norte-routing-audit.json --output=.tmp-routing/osm/compact-audit.json

node scripts/compare-routing-audits.cjs --legacy=.tmp-routing/osm/legacy-audit.json --compact=.tmp-routing/osm/compact-audit.json --output=docs/data/davao-del-norte-memory-audit.json
```

Each audit runs in a fresh Node process using identical working-tree routing sources, including pending navigation edits. The comparison rejects changed sources, datasets or route samples and requires exact route fingerprints (node path, geometry, maneuvers, distance and ETA). All 36 samples matched: 34 successful routes and two expected mainland-to-Samal no-route results.

| Desktop measurement | Legacy JSON | Compact JSON |
| --- | ---: | ---: |
| File size (decimal MB) | 141.6 | 41.3 |
| Peak resident memory (MiB) | 834 | 445 |
| Retained JS heap after routes and explicit GC (MiB) | 551 | 210 |

Peak memory includes parsing, Babel, routing and the audit harness. The older geographic audit used a different harness that retained the raw source buffer, so its RSS number is not the comparison baseline. Measurements are observations from this Windows/Node run, not mobile limits or guaranteed speedups. See [the memory comparison](data/davao-del-norte-memory-audit.json) for fingerprints and per-route timings.

Compact graphs still load the whole province. Selective regional loading, shared provincial pack storage, turn/barrier enforcement, and device validation remain release gates. The candidate is still ignored under `.tmp-routing/osm/`, with no provincial runtime registration. Use [the device checklist](ROUTING_DEVICE_CHECKLIST.md) for current shipped-pack regressions and the later provincial gate.

## Checks

```powershell
python scripts/test_import_osm_roads.py
npm run check
```

The Python fixture writes and reads a real miniature PBF to check preservation of node identities, tags and relation members. The JS builder fixtures check checksum rejection, separate coincident nodes, access rules, one-way direction, province extent, and legacy input compatibility.
