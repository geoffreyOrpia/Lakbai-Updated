<p align="center">
  <img src="./assets/lakbai-mark.png" alt="LakBai mark" width="150" />
</p>

<h1 align="center">LakBai</h1>

<p align="center"><strong>Go beyond. Go local.</strong></p>

<p align="center">
  An offline-first tourism companion focused exclusively on Davao del Norte — local destination guides, bundled photos, trip planning, and travel-preparation tools that keep working beyond the signal.
</p>

---

## Architecture

LakBai is a device-only Expo application built with MVVM / Clean Architecture.

The mobile source is pure JSX. UI components and business operations use `const`/`let` and arrow functions; React state, props, and refs provide the native-safe equivalent of browser DOM selectors.

```text
presentation/  →  domain/usecases/  →  domain/repositories
                                            ↓
                                   data/repositories/
                                            ↓
                              expo-sqlite + bundled seed data
```

- **Presentation:** screens and view models contain UI state but no persistence logic.
- **Domain:** models, repository contracts, and use cases describe app rules.
- **Data:** repositories and DAOs store the catalog, packs, itineraries, preferences, library state, and safety checklist in SQLite.
- **Bundled content:** Davao del Norte destination guides, licensed photos, spots, transport notes, and safety information ship with the app and seed SQLite automatically.

LakBai does not require an application backend, login, registration, or internet connection for its saved travel data. Existing account-scoped itineraries are migrated to the single device-local profile; legacy account credentials are removed after migration because accounts are no longer used. When connected, the destination map can request OpenStreetMap standard tiles and optional research/directions actions open the device's secure browser. Offline mode instead uses bundled/saved map files and SQLite data. Nearby Places and the in-app trail navigator use foreground GPS locally; LakBai does not upload that position. Trail navigation uses saved MapLibre/PMTiles data and does not require Google Maps or network tiles.

## Running

```bash
npm install
npx expo start       # press a (Android) or i (iOS)
```

## Features

- **Device-only setup** — animated tourism landing and a short preference setup with no account gate.
- **Explore** — a Davao del Norte-only catalog with search, categories, bundled destination images, inline Favorites, and save/update controls.
- **Optional online research** — search the live web for a place or activity within Davao del Norte through the device's secure browser; no app backend or account is required.
- **Destination maps** — MapLibre uses OpenStreetMap standard tiles while connected and a bundled Davao del Norte PMTiles basemap plus saved GeoJSON offline; visible status and fallback handling keep local context on map failures.
- **Offline road/path navigation pilot** — Panabo calculates walking routes entirely on-device with A* over a bundled HOT/OpenStreetMap road graph, renders them on the saved PMTiles basemap, derives maneuver guidance from mapped road geometry and names, tracks foreground GPS progress, pauses guidance on poor accuracy, confirms off-route movement before local rerouting, and hands arrival into the verified mangrove Trail Mode. No Google Maps or routing server is required.
- **Road-arrival directions** — external Maps remains an optional fallback/comparison for destinations that do not yet have LakBai routing coverage.
- **Verified trail navigation** — source-verified trail geometry opens in LakBai's own MapLibre navigator with the saved PMTiles basemap, live foreground GPS, course-follow/recenter, progress, next-waypoint guidance, GPS-accuracy handling, and off-route warnings. The first enabled showcase is the source-matched 214 m Panabo Mangrove Park segment; unverified geometry remains hidden.
- **Suggested routes** — curated stop sequences can be sent into an editable Trips draft as planning-only content, separate from verified GPS navigation.
- **Local Library** — save built-in packs into durable app document storage, safely refresh versioned packs through staging/backup replacement, remove pack files, and see the measured local storage footprint.
- **Nearby Places** — rank saved POIs and a clearly labeled approximate destination-area center using the foreground GPS fix entirely on-device, with GPS-accuracy feedback.
- **Verified-route policy** — prototype trail geometry is hidden from release builds until every waypoint is checked against an authoritative local or mapping source.
- **Trips** — personal itineraries with a multi-stop builder, reordering, route-draft import, and per-trip offline-readiness scoring.
- **Content provenance** — available destination packs expose source-review status and source scope; coming-soon content is explicitly labeled prototype.
- **Safety** — a persisted checklist plus emergency contacts aggregated from saved packs.

## Version 1 technology rules

Free and open-source only: React Native + Expo 54, SQLite, expo-location, expo-file-system, MapLibre React Native, OpenStreetMap for the live online base map, react-native-svg, and bundled destination content. Saved packs keep both LakBai's local places and an MIT-licensed 2023 PSGC municipality boundary for recognizable offline regional context. The app also ships a bounded Davao del Norte PMTiles archive (~5.9 MB) with offline roads, water, land, and buildings from Protomaps/OpenStreetMap data without bulk-downloading the public OpenStreetMap tile service. A separate ~4.6 MB Panabo pilot graph is generated from the HOT OSM Philippines Roads export and used for on-device A* routing; the routing builder accepts `--id`, `--name`, `--bounds`, `--output`, and source-metadata arguments so the same pipeline can produce additional municipality graphs. Saved packs with registered routing coverage include their graph as `routing.graph.json`. Maintainers can regenerate the visual PMTiles basemap with `npm run maps:prepare` after installing the official PMTiles CLI. MapLibre contains custom native code, so the map-enabled app requires an Expo development/native build rather than Expo Go. No paid APIs, Firebase, account service, routing server, or cloud dependency.


## Routing edge geometry

Routing edges may include a GeoJSON `geometry: { type: 'LineString', coordinates: [[lng, lat], ...] }` containing both graph endpoints and the original road vertices between them. The runtime orients the coordinates from `from` to `to`, removes repeated vertices, and measures distance along the polyline. Snapping, partial-edge routes, map rendering, progress, and junction bearings use that same geometry. Invalid geometry falls back to the legacy node segment; existing packs remain compatible.

The current HOT graph builder already preserves each source coordinate as a graph node, so Panabo does not need regeneration for this change. Explicit edge geometry supports packs that store multiple road vertices between routing junctions. It preserves supplied detail; it does not interpolate invented road bends or increase the resolution of the source dataset.

The navigation target is all of Davao del Norte, including journeys across municipal boundaries. See [the provincial navigation roadmap](docs/NAVIGATION_ROADMAP.md) for the build command, rollout order, and coverage acceptance criteria.
