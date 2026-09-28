# Davao del Norte navigation roadmap

LakBai targets the entirety of Davao del Norte. Panabo is the initial routing dataset and a regression fixture, not the product boundary. Every navigation improvement must work with any validated graph in the province.

## Geographic acceptance

The bundled municipality boundary asset identifies Asuncion, Braulio E. Dujali, Carmen, Kapalong, New Corella, Panabo, Samal, San Isidro, Santo Tomas, Tagum, and Talaingod. Include urban roads, rural roads, and verified walking paths where source data supports them. A tourism pack is not the boundary of the road network.

Use a shared provincial graph for connected mainland trips across municipal boundaries. Keep Samal's island road network disconnected from the mainland until verified ferry links and their travel rules are modeled. Do not bridge water with a straight line or estimate ferry schedules from road speeds. Existing municipal boundary data is a build extent, not evidence of current road completeness.

## Implementation order

1. Finish and validate the pending directions-list and fork-guidance work. Keep the existing edits intact until reviewed and committed.
2. Harden live navigation throughout the province: heading-aware route matching, wrong-way detection, jitter and stale-fix handling, reroute cooldowns, and explicit GPS-loss recovery. Use reproducible GPS traces from different road layouts rather than city-specific behavior.
3. Improve source restrictions and maneuver rules: access and one-way rules, prohibited turns, roundabout exits, forks, and road-name transitions. Unknown restrictions must remain visible limitations of the data.
4. Build and validate provincial road data. Test local journeys in every listed area and connected mainland journeys across city/municipal boundaries. Publish graph versions, source dates, tested coverage, and disconnected components. The automated integration gate now passes; complete the device and field gates before claiming validated coverage. Avoid duplicating the entire provincial graph in each tourism pack.
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

Provincial road routing is now enabled through the five existing downloadable guide packs: Panabo, Tagum, Samal, Hagimit Falls and Monfort Bat Sanctuary. Mainland packs share one connected regional graph; Samal packs share a separate island graph. Place coordinates select the region, and municipal boundaries do not truncate mainland trips. This supplies mapped road coverage across all 11 municipalities; it does not create guide packs or verified entrances for places missing from the catalog.

The dated Geofabrik source and full build candidate remain ignored under `.tmp-routing/osm/`. The reproducible, partitioned `.routing` assets are bundled: 39.5 MB mainland and 1.9 MB Samal. Navigation parses only the selected region and retains one repository graph. This is regional loading, not fine-grained tile loading; mainland mobile memory and latency still need measurement.

Six incomplete restriction relations are retained in provenance. Driving is disabled on their three known approach ways rather than inventing missing turns. The shipped runtime tables have no unresolved restriction records. Conditional rules and gates still use conservative permissions. See [the OSM pipeline](OSM_PIPELINE.md) and [pack integration audit](data/davao-del-norte-pack-audit.json): 34 local/cross-municipal walking and driving samples pass, and four mainland–Samal crossings are explicitly rejected. Catalog previews pass except driving to Panabo's boardwalk, for which no permitted connected route is available.

Shared files are checked before use and promoted only after successful copying. Existing per-pack graphs remain readable; failed updates can use a checksum-verified older shared reference. Pack removal preserves shared data. Real-device offline validation remains pending; desktop route success does not establish field-verified coverage. Use [the device checklist](ROUTING_DEVICE_CHECKLIST.md).

Dynamic navigation hardening is now implemented in automated coverage: heading-aware matching, sustained wrong-way detection, jitter/stale-fix handling, GPS recovery, reroute confirmation/cooldowns, confirmed approach history across in-progress restricted-junction reroutes, directions-list/fork guidance, and OSM roundabout entry/numbered-exit maneuvers. These remain device-verification pending; deterministic traces are not live-GPS evidence.

Province-wide offline discovery is now implemented from bundled data: curated destination/place aliases, a generated lightweight street index from the mainland and Samal routing graphs, device-local recent targets, and long-press dropped pins on the offline provincial map. Street matches, mapped POIs, derived destination-area centers and user pins keep distinct coordinate-status labels; none are promoted to a locally verified entrance unless the underlying catalog explicitly says so. Search does not require GPS or internet, while an optional foreground fix only improves distance ordering and saved-pack nearby ranking.

Next implementation priority: model a verified mainland–Samal ferry journey layer so LakBai can connect the two road regions without drawing an impossible road across the channel. Until terminal geometry and ferry-leg behavior are source-verified, cross-channel routing must continue to be rejected. A combined road/trail journey model remains separate later work.
