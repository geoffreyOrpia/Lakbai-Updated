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

The core mobile application makes no REST request and does not require a backend, login, registration, or internet connection. Existing account-scoped itineraries are migrated to the single device-local profile; legacy account rows are preserved but no longer used. When Wi-Fi or mobile data is available, optional research and directions actions open the device's secure browser without changing the offline SQLite data. LakbayLokal does not send the device's precise location; the traveler can choose **Your location** inside Maps under Maps' own permission controls.

## Running

```bash
npm install
npx expo start       # press a (Android) or i (iOS)
```

## Features

- **Device-only setup** — animated tourism landing and a short preference setup with no account gate.
- **Explore** — a Davao del Norte-only catalog with search, categories, bundled destination images, and offline place information.
- **Optional online research** — search the live web for a place or activity within Davao del Norte through the device's secure browser; no app backend or account is required.
- **Destination routes** — open a destination or point of interest in Google Maps when connected, then choose **Your location** as the starting point.
- **Local library** — save built-in packs to a personal SQLite library without downloading from the internet.
- **Verified-route policy** — prototype trail geometry is hidden from release builds until every waypoint is checked against an authoritative local or mapping source.
- **Trips** — personal itineraries with a multi-stop builder, reordering, and per-trip offline-readiness scoring.
- **Local Library** — saved-pack summary and library management.
- **Safety** — a persisted checklist plus emergency contacts aggregated from saved packs.

## Version 1 technology rules

Free and open-source only: React Native + Expo, SQLite, expo-location, react-native-svg, and bundled destination content. No paid APIs, Firebase, account service, server, or cloud dependency.
