# Davao del Norte navigation roadmap

LakBai targets the entirety of Davao del Norte. Panabo is the initial routing dataset and a regression fixture, not the product boundary. Every navigation improvement must work with any validated graph in the province.

## Geographic acceptance

The bundled municipality boundary asset identifies Asuncion, Braulio E. Dujali, Carmen, Kapalong, New Corella, Panabo, Samal, San Isidro, Santo Tomas, Tagum, and Talaingod. Include urban roads, rural roads, and verified walking paths where source data supports them. A tourism pack is not the boundary of the road network.

Use a shared provincial graph for connected mainland trips across municipal boundaries. Keep Samal's island road network disconnected from the mainland until verified ferry links and their travel rules are modeled. Do not bridge water with a straight line or estimate ferry schedules from road speeds. Existing municipal boundary data is a build extent, not evidence of current road completeness.

## Implementation order

1. Finish and validate the pending directions-list and fork-guidance work. Keep the existing edits intact until reviewed and committed.
2. Harden live navigation throughout the province: heading-aware route matching, wrong-way detection, jitter and stale-fix handling, reroute cooldowns, and explicit GPS-loss recovery. Use reproducible GPS traces from different road layouts rather than city-specific behavior.
3. Improve source restrictions and maneuver rules: access and one-way rules, prohibited turns, roundabout exits, forks, and road-name transitions. Unknown restrictions must remain visible limitations of the data.
4. Build and validate provincial road data. Test local journeys in every listed area and connected mainland journeys across city/municipal boundaries. Publish graph versions, source dates, tested coverage, and disconnected components. Register data in runtime loaders and packs only after validation; avoid duplicating the entire provincial graph in each tourism pack.
5. Improve offline discovery: place and street search, local-name aliases, dropped pins, recent destinations, and verified entrance coordinates.
6. Represent road and verified-trail legs as a single journey with total distance/ETA. Then add multi-stop journeys and alternative-route previews.

Real-device testing accompanies each navigation milestone: offline cold start, walking/driving, missed turns, parallel roads, poor GPS, screen locking, app switching, voice guidance, battery use, and recovery. Panel demos use visibly labeled recorded/simulated GPS with a separate real-GPS mode.

## Provincial graph build

Run from the repository root:

```powershell
npm run routing:prepare:province -- --source="D:/path/to/roads.geojson" --source-exported-at="YYYY-MM-DD"
```

Supply the actual source export date. The current reader expects the HOT export layout: one complete GeoJSON Feature per line. Override `--source-dataset`, `--source-attribution`, and `--license` when the input differs from the default HOT/OpenStreetMap source. Do not submit a date placeholder.

The command derives a bounding box from all municipality polygons, writes `src/data/assets/davaoDelNorteRoutingGraph.json`, and records intended areas with validation status `unverified`. The box can include neighboring territory. It does not clip roads precisely to the administrative boundary, assert full provincial coverage, or create ferry links. `--bounds` cannot narrow a named provincial build; use `routing:prepare` without `--region` for an explicitly custom extent.

The legacy `npm run routing:prepare` retains its Panabo defaults. An empty or incompatible input fails before replacing the output. Generating a file does not automatically enable navigation or publish a pack.

## Current evidence and next data gate

The shipped routing graph covers central/coastal Panabo. Province-wide runtime coverage has not yet been delivered. The repository has municipality boundaries, but no provincial road source was found in the inspected workspace and `LAKBAI_ROUTING_SOURCE` is unset.

Next coverage gate: obtain a licensed provincial road source with provenance, check its access/topology limitations, generate the candidate, measure graph size and on-device memory/route latency, and validate connectivity and representative routes across all intended areas. Only then wire the shared graph into saved-pack storage and runtime graph selection. A graph that merely touches each municipality is not sufficient evidence of usable coverage.
