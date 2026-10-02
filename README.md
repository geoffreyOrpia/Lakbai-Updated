<p align="center">
  <img src="./assets/lakbai-lockup.png" alt="LakBai" width="320" />
</p>

# LakBai

**Offline-first tourism and navigation for Davao del Norte.**

LakBai helps travelers discover local destinations, save travel information for offline use, plan trips, and navigate without depending on Google Maps or a routing server.

## Core features

- Offline destination guides, photos, favorites, and saved packs
- Province-wide offline place and street discovery
- On-device walking and driving routes with turn guidance and rerouting
- Mainland–Samal road–ferry–road journeys
- Continuous road-to-verified-trail navigation
- Alternative route previews and resumable multi-stop trips
- Nearby places, Smart Explore recommendations, and trip planning
- Offline safety checklist and emergency information
- Source-aware tourism content with clear verification status

## Technology

- React Native + Expo SDK 54
- SQLite for device-local data
- MapLibre + PMTiles for offline maps
- OpenStreetMap-based offline routing data
- Expo Location and Speech for live navigation
- Jest, Expo Lint, Expo Doctor, and GitHub Actions for quality checks

LakBai does not require a user account, application backend, paid map API, or cloud AI service for its core features.

## Run locally

```bash
npm ci
npm start
```

LakBai requires its own development app on your phone because MapLibre uses native code that Expo Go does not include. Expo Go cannot run all of LakBai's existing features. The QR code from `npm start` opens the LakBai development app, so Expo Go may ignore it.

For Android, create the development app once:

```bash
npx eas-cli build --platform android --profile development
```

Sign in to your Expo account when prompted, then install the APK from the build link on your phone. Run `npm start` on your computer with both devices on the same Wi-Fi network. Scan the QR code with your phone camera or open the installed LakBai development app and select the development server.

If your Wi-Fi blocks the connection, use:

```bash
npm run start:tunnel
```

Accept Expo's prompt to install its tunnel helper if needed. Keep the server running while testing. Rebuild the development app when native dependencies or native configuration change; ordinary screen and logic edits only need the running server.

`npm run start:go` explicitly generates an Expo Go QR code for troubleshooting, but it does not add MapLibre support to Expo Go. This project uses SDK 54, so Expo Go would also need a compatible SDK 54 version. Use the development app to test the complete project.

Run the full project checks with:

```bash
npm run check
```

## Project structure

```text
src/presentation/   screens, components, view models, navigation
src/domain/         use cases and application rules
src/data/           SQLite, repositories, bundled content, routing data
scripts/            offline map/routing build and audit tools
docs/               data, privacy, release, and OSM documentation
__tests__/          automated tests
```

## Important documentation

- [Data sources and verification](docs/DATA_SOURCES.md)
- [Privacy and local data](docs/PRIVACY.md)
- [OSM routing pipeline](docs/OSM_PIPELINE.md)
- [Release and device checklist](docs/RELEASE_CHECKLIST.md)

Tourism information currently marked as source-reviewed was reviewed from public online sources; it is not presented as physical field verification. OpenStreetMap-derived data remains subject to OpenStreetMap/ODbL attribution requirements.
