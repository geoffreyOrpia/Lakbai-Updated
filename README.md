<p align="center">
  <img src="./assets/logo.png" alt="LakbayLokal Logo" width="180" />
</p>

<h1 align="center">LakbayLokal</h1>

<p align="center"><strong>Go Beyond, Go Lokal.</strong></p>

LakbayLokal is an **offline-first tourist trail and destination information mobile application for Davao del Norte**. It is designed to help travelers prepare destination information before a trip and continue accessing essential local guidance when mobile data or internet connectivity becomes weak or unavailable.

The application focuses on a simple travel flow:

**Download a destination pack → Travel offline → Follow saved local trails and information**

## Purpose

Tourists visiting unfamiliar destinations can become dependent on an internet connection for directions, attraction information, and travel guidance. LakbayLokal aims to reduce that dependency by keeping important tourism content available on the user's device.

The project is intended to provide a compact, practical tourism companion rather than replace general-purpose navigation applications.

## Core Product Features

The planned LakbayLokal experience centers on six core features:

- **Destination Pack Download** — save selected destination content before traveling.
- **Offline Tourist Map** — access locally stored map information without mobile data.
- **Predefined Tourist Trails** — follow curated routes prepared for local destinations.
- **Offline GPS Position** — use device positioning while viewing saved travel content.
- **Travel & Safety Information** — keep destination notes, reminders, and essential safety information available offline.
- **Personal Itineraries** — registered users can organize curated LakbayLokal destinations into their own locally stored, offline-ready trip plans.

## Target Users

LakbayLokal is primarily designed for:

- First-time visitors
- Solo travelers
- Students and young travelers
- Eco-tourists and hikers
- Local tourism communities
- Nearby tourism-related MSMEs

## Current Front-End

The repository currently contains the front-end foundation of the application. The interface uses local mock data while the offline map, storage, download, and GPS integrations are developed separately.

Current main screens:

- **Authentication** — optional Login, Create Account, or Continue as Guest entry flow.
- **Home** — destination discovery, offline-readiness status, and recommended packs.
- **Explore** — searchable and filterable destination-pack discovery.
- **Downloads** — presentation of downloaded and available destination packs.
- **Trips** — registered-user personal itinerary creation using curated destination packs, with local SQLite persistence.
- **Safety** — offline travel preparation, safety reminders, and essential-information categories.

Current sample destination packs include Samal Island, Tagum City, Kapalong, and San Isidro.

## Design Direction

LakbayLokal follows a **compact, clean, information-focused** mobile design. The interface prioritizes quick scanning, restrained spacing, clear offline status, and minimal visual clutter.

Primary theme:

- Forest Green — `#1F5B3A`
- Warm Orange — `#E99A2B`
- Off-white — `#F6F2EA`

The complete UI rules, spacing system, typography, component patterns, accessibility guidance, and front-end guardrails are documented in [`design.md`](./design.md).

## Technology Stack

### Current repository

- **React Native 0.81.5**
- **Expo SDK 54**
- **React 19.1**
- **TypeScript 5.9**
- **Expo Vector Icons / Ionicons**
- **Expo SQLite** — persistent on-device storage for personal itineraries.

### Planned offline-first integrations

- Expo Location / device GPS
- MapLibre React Native
- OpenStreetMap-based map data
- Expo FileSystem
- JSON destination-pack metadata
- GeoJSON trails, points of interest, and route data

The project is designed around free/open-source core technologies and does not require a paid AI API, Google Maps API, or special hardware for its core functionality.

## Project Structure

```text
LakbayLokal/
├── App.tsx
├── index.ts
├── app.json
├── design.md
├── README.md
├── src/
│   ├── components/
│   │   ├── AppHeader.tsx
│   │   ├── BottomNav.tsx
│   │   ├── CategoryChips.tsx
│   │   ├── DestinationCard.tsx
│   │   ├── SearchField.tsx
│   │   └── SectionHeader.tsx
│   ├── data/
│   │   └── destinations.ts
│   ├── screens/
│   │   ├── AuthScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── ExploreScreen.tsx
│   │   ├── DownloadsScreen.tsx
│   │   ├── TripsScreen.tsx
│   │   └── SafetyScreen.tsx
│   ├── storage/
│   │   └── itineraryStore.ts
│   ├── types/
│   │   └── navigation.ts
│   └── theme.ts
├── assets/
├── package.json
└── tsconfig.json
```

## Getting Started

### Requirements

- Node.js 20 or newer
- npm
- Expo Go or an Android/iOS development environment

### Install dependencies

```bash
npm install
```

### Start the Expo development server

```bash
npm start
```

You can also use:

```bash
npm run android
npm run ios
npm run web
```

## Development Notes

- Keep the project on **Expo SDK 54** unless an upgrade is intentionally planned and tested.
- Follow [`design.md`](./design.md) before introducing new screens or reusable UI components.
- Reuse the centralized tokens in `src/theme.ts` instead of hardcoding new brand styles.
- The application is currently **front-end only**; destination downloads, actual offline map rendering, persistent storage, and GPS navigation are not yet connected to production data or services.
- Temporary feedback should use the application's custom notifier/snackbar system once implemented rather than native Android toast/snackbar UI.

## License

See [`LICENSE`](./LICENSE) for repository licensing information.
