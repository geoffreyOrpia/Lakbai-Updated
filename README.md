<p align="center">
  <img src="./assets/logo.png" alt="LakbayLokal Logo" width="190" />
</p>

<h1 align="center">LakbayLokal</h1>

<p align="center"><strong>Go beyond. Go local.</strong></p>

<p align="center">
  An offline-first tourism companion focused exclusively on Davao del Norte — local destination guides, bundled photos, trip planning, and travel-preparation tools that keep working beyond the signal.
</p>

---

## Architecture

LakbayLokal is a device-only Expo application built with MVVM / Clean Architecture.

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

LakbayLokal does not require an application backend, login, registration, or internet connection for its saved travel data. Existing account-scoped itineraries are migrated to the single device-local profile; legacy account credentials are removed after migration because accounts are no longer used. When connected, the destination map can request OpenStreetMap standard tiles and optional research/directions actions open the device's secure browser. Offline mode instead uses bundled/saved map files and SQLite data. Nearby Places uses the device's foreground GPS fix locally; LakbayLokal does not upload that position.

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
- **Destination routes** — open a destination or point of interest in Google Maps when connected, and send planning-only suggested routes directly into an editable Trips draft without exposing unverified GPS geometry.
- **Local Library** — save built-in packs into durable app document storage, safely refresh versioned packs through staging/backup replacement, remove pack files, and see the measured local storage footprint.
- **Nearby Places** — rank saved POIs and a clearly labeled approximate destination-area center using the foreground GPS fix entirely on-device, with GPS-accuracy feedback.
- **Verified-route policy** — prototype trail geometry is hidden from release builds until every waypoint is checked against an authoritative local or mapping source.
- **Trips** — personal itineraries with a multi-stop builder, reordering, route-draft import, and per-trip offline-readiness scoring.
- **Content provenance** — available destination packs expose source-review status and source scope; coming-soon content is explicitly labeled prototype.
- **Safety** — a persisted checklist plus emergency contacts aggregated from saved packs.

## Version 1 technology rules

Free and open-source only: React Native + Expo 54, SQLite, expo-location, expo-file-system, MapLibre React Native, OpenStreetMap for the live online base map, react-native-svg, and bundled destination content. Saved packs keep both LakbayLokal's local places and an MIT-licensed 2023 PSGC municipality boundary for recognizable offline regional context. The app also ships a bounded Davao del Norte PMTiles archive (~5.9 MB) with offline roads, water, land, and buildings from Protomaps/OpenStreetMap data without bulk-downloading the public OpenStreetMap tile service. Maintainers can regenerate it with `npm run maps:prepare` after installing the official PMTiles CLI. MapLibre contains custom native code, so the map-enabled app requires an Expo development/native build rather than Expo Go. No paid APIs, Firebase, account service, server, or cloud dependency.
