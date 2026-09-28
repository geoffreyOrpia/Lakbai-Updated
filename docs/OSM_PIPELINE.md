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

Generated data is an **unverified candidate**, not automatically registered or shipped. Road presence in all municipalities does not prove complete coverage. The engine now enforces supported turn restrictions and node passage rules. Incomplete relations remain explicit validation failures; see the restriction audit below. Ferry ways are excluded from the road network. Conditional timing and country-specific defaults need further work.

The geographic audit reports road-node counts, weak components, directed reachability between automatically selected anchors, source fingerprints, and graph size. Weak connectivity alone ignores travel direction. Anchors are test coordinates on the graph, not verified destination entrances. The runtime audit executes the actual JS routing engine on walking and driving samples within all 11 municipalities, representative mainland pairs, and a mainland-to-Samal pair. It checks the graph fingerprint and records the working-tree routing source fingerprints; this audit includes the pending navigation edits. Timing and memory are desktop measurements, not mobile performance claims.

Same-road snap matching now distinguishes imported segment IDs so parallel sections of one OSM way remain distinct. Do not activate the provincial candidate until unresolved source restrictions, shared storage, mobile memory and route latency, coverage failures, and real-device offline behavior have been addressed. Keep the shipped Panabo data available during that transition.

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

Compact graphs still load the whole province. Selective regional loading, shared provincial pack storage, unresolved source restrictions, and device validation remain release gates. The candidate is still ignored under `.tmp-routing/osm/`, with no provincial runtime registration. Use [the device checklist](ROUTING_DEVICE_CHECKLIST.md) for current shipped-pack regressions and the later provincial gate.

## Turn restrictions and node passage

Routing search now retains restriction progress as part of its search state. Reaching the same junction from another road can have a different legal continuation. Relations compile into directed edge sequences through a via node or ordered via ways, including ways split into several graph edges. Partial snapped edges retain their original transition identity. This applies to both compact and legacy graphs that contain the required OSM records.

Supported values are `no_left_turn`, `no_right_turn`, `no_u_turn`, `no_straight_on`, `only_left_turn`, `only_right_turn`, `only_straight_on`, `only_u_turn`, `no_entry` and `no_exit`. Mode-specific keys/types and semicolon-separated exceptions select the applicable rules. Walking does not inherit generic vehicle turn restrictions. Source references: [OSM restriction relations](https://wiki.openstreetmap.org/wiki/Relation:restriction), [access](https://wiki.openstreetmap.org/wiki/Key:access), and [barriers](https://wiki.openstreetmap.org/wiki/Key:barrier).

Conditional turn prohibitions/obligations are conservatively applied all day; there is no schedule evaluator. Conditional access does not establish permission. Malformed, disconnected or excessively complex relation paths are recorded in `routingPolicy.unresolved`, not guessed. Compilation caps at 256 path edges, 256 alternatives and 10,000 traversal visits per applicable rule. Unresolved records remain a provincial release gate.

Node policy uses `foot` for walking, and `motorcar`, `motor_vehicle`, then `vehicle` for driving, ahead of general `access`. Private/destination/customer-only or unknown access is excluded from public through-routing. Bollards and common pedestrian-passable barriers allow walking but block driving unless explicit mode permission establishes passage. Gates require mapped public permission; locked gates block passage. Unknown barriers, fences and walls block passage by default. A generic `access=yes` does not make a physical bollard passable by car. These are deliberately conservative app defaults, not assertions about unmapped real-world gate access. Vehicle dimensions, permits, opening hours and live gate status are not modeled.

Routes can end at a blocked node on its approach side, but cannot expand through or depart from that node. A route ending immediately before a barrier remains possible. Starting a new calculation midway along a road preserves restrictions ahead; it cannot infer an approach driven before that starting position. Carrying confirmed traversal history across a reroute that begins inside a multi-way restricted maneuver remains future navigation-state work.

The dated provincial candidate contains 328 relations: 321 driving rules compile (13 conditional rules use the conservative policy), one public-service-vehicle-only relation is inapplicable to car mode, and six relations have incomplete member lists. Their IDs and reasons are retained in [the restriction audit](data/davao-del-norte-restriction-audit.json). No pedestrian-specific relation occurs in this candidate; dedicated fixtures exercise that behavior. The importer now also preserves `type=restriction:foot` and other mode-specific relation types in future imports.

The audit identifies 3,971 tagged barrier nodes. Passage is blocked at 3,196 nodes for walking and 3,354 for driving, including access-tagged nodes. All 34 successful geographic route samples still succeed; both mainland-to-Samal samples still return no route. These samples do not traverse every restricted junction; dedicated junction fixtures establish rule behavior. Historical audit files and source metadata describe the engine at their original build time; the latest runtime policy summary is authoritative for enforcement capability.

```powershell
node --expose-gc --max-old-space-size=4096 scripts/audit-routing-runtime.cjs --graph=.tmp-routing/osm/davaoDelNorteRoutingGraph.compact.json --report=docs/data/davao-del-norte-routing-audit.json --output=docs/data/davao-del-norte-restriction-audit.json
```

The candidate remains disabled pending source cleanup, pack integration and device validation.

## Checks

```powershell
python scripts/test_import_osm_roads.py
npm run check
```

The Python fixture writes and reads a real miniature PBF to check preservation of node identities, tags and relation members. The JS builder fixtures check checksum rejection, separate coincident nodes, access rules, one-way direction, province extent, and legacy input compatibility.
