<p align="center">
  <img src="./assets/logo.png" alt="LakbayLokal Logo" width="190" />
</p>

<h1 align="center">LakbayLokal</h1>

<p align="center"><strong>Go beyond. Go local.</strong></p>

<p align="center">
  An offline-first tourism companion for discovering, preparing, and organizing trips around Davao del Norte.
</p>

---

## 🌿 Discover Davao del Norte, even beyond the signal

LakbayLokal is a **mobile tourism application for Davao del Norte** designed around one practical idea: travelers should be able to prepare useful destination information before leaving reliable internet coverage.

The app brings destination discovery, offline preparation, personal itinerary planning, and travel-readiness tools into one compact experience inspired by local exploration.

**Explore → Save → Plan → Travel prepared**

LakbayLokal is intended to complement local tourism information and trip preparation. It is not meant to replace official advisories, emergency services, local guides, or full navigation platforms.

## 🧭 Current Travel Experience

The application now has a working end-to-end prototype flow:

1. **Animated tourism landing page** introduces LakbayLokal using the standalone logo, travel accents, a gentle floating animation, and reduced-motion accessibility support.
2. Travelers continue to the **authentication entry flow** and may log in, create an account, or continue as a guest.
3. New accounts complete a separate **signup onboarding phase** for travel interests, travel pace, and offline-preparation preference.
4. The main experience uses the navigation order **Home → Explore → Trips → Downloads → Safety**.
5. Travelers can discover destination packs, save their offline-ready state, organize personal itineraries, and complete a persistent safety checklist.

The landing page and account onboarding are intentionally separate: the landing page introduces the tourism experience, while signup onboarding personalizes a newly created account.

## ✨ Implemented Features

### Tourism Landing Experience

- Animated standalone LakbayLokal logo using React Native's built-in animation system.
- Tourism-inspired compass and location accents.
- Coordinated logo, hero, feature, and call-to-action entrance motion.
- Gentle idle floating and halo animation after the initial reveal.
- Reduced-motion support through React Native accessibility settings.

### Guest and Local Account Access

- Optional **Login**, **Create Account**, or **Continue as Guest** flow.
- Local account registration and authentication using SQLite.
- Salted password hashing for the current offline prototype.
- Persistent signed-in session restoration after restarting the app.
- Explicit sign-out action for authenticated users.
- Guest users can still browse destinations, manage offline pack state, and use travel-preparation features.

> The current account system is an on-device prototype and is not a production cloud authentication service.

### Signup Onboarding

Newly registered accounts complete a three-step onboarding experience:

- **Travel interests** — island, city, nature, and adventure experiences.
- **Travel pace** — relaxed, balanced, or active.
- **Offline preparation** — preference for preparation reminders before travel.

Onboarding completion and preferences are persisted locally with SQLite.

### Home

- Tourism-focused Davao del Norte introduction.
- Search field that opens Explore with the submitted destination query.
- Dynamic offline-readiness summary based on locally saved packs.
- Recommended destination packs.
- Quick access to the Downloads screen.
- Simple travel preparation flow explaining how LakbayLokal is intended to work.

### Explore

- Search destination packs by name, area, municipality, or description.
- Filter destinations by tourism category.
- View destination summary information, spot counts, trail counts, and estimated pack size.
- Save or remove available destination packs from the local offline library state.
- Success and error feedback through the global snackbar system.

### Downloads

- Persistent local offline-pack state using SQLite.
- Separate views for packs already saved on the device and packs still available to save.
- Dynamic count of downloaded packs and estimated storage usage.
- Download/remove controls with busy states.
- Offline state remains available after restarting LakbayLokal.

### Personal Trips

Registered users can create and manage their own itineraries using curated LakbayLokal destinations.

Implemented trip tools include:

- Create a named itinerary with a travel date.
- Add optional trip notes.
- Add available destination packs as itinerary stops.
- Add a planned time and note to each stop.
- Reorder stops before saving.
- Remove stops while building an itinerary.
- Persist itineraries locally using SQLite.
- View saved itinerary details and timeline.
- See total trips, stops, and offline-ready stops.
- View per-trip offline-readiness percentage.
- Delete itineraries with an actionable confirmation snackbar.

Guest users can view the Trips area but must sign in before creating or managing personal itineraries.

### Safety & Travel Readiness

- Persistent pre-travel safety checklist.
- Mark checklist items ready or reopen them later.
- Reset the checklist when preparing for a new trip.
- Checklist state is saved locally on the device.
- Travel-preparation categories for medical information, contacts, routes, and advisories.
- Reminder that LakbayLokal supplements rather than replaces official safety information.

### App-Wide Feedback System

LakbayLokal uses one consistent feedback system instead of mixing native alerts and custom messages:

- **HUD** — blocking progress feedback for important operations such as account creation, login, onboarding completion, itinerary saving, and itinerary deletion.
- **Snackbar** — actionable or persistent success/error feedback for downloads, itinerary actions, safety actions, and destructive confirmation.
- **Toast** — lightweight confirmation for short-lived status changes such as guest mode, sign-in, sign-out, and checklist updates.

## 🗺️ Destination Packs

Current prototype destination data includes:

- **Samal Island** — island tourism
- **Tagum City** — city discovery
- **Kapalong** — nature-focused destinations
- **San Isidro** — outdoor and adventure destinations

Destination packs currently contain prototype metadata such as destination category, municipality, description, spot count, trail count, availability status, and estimated size.

### Important prototype boundary

The application currently persists whether a pack has been saved to the local offline library, but it does **not yet download complete production map tiles, GeoJSON trail files, attraction media, or live tourism datasets**.

Actual offline map rendering, downloadable trail datasets, and device GPS navigation remain future integration work. The README separates those planned capabilities from the features that are already functioning in the repository.

## 🏞️ Product Direction

LakbayLokal is being developed as a practical tourism companion for travelers who may encounter weak or inconsistent connectivity while exploring local destinations.

The experience prioritizes:

- Local tourism discovery
- Offline preparation before travel
- Lightweight on-device storage
- Clear trip organization
- Simple safety reminders
- Guest-friendly access
- Minimal dependency on paid APIs

Potential users include first-time visitors, solo travelers, students, eco-tourists, hikers, local travelers, tourism communities, and tourism-related MSMEs.

## 🎨 Visual Identity

LakbayLokal uses an earthy tourism-inspired palette influenced by nature, trails, and warm local travel experiences.

| Role | Color |
| --- | --- |
| Forest Green | `#1F5B3A` |
| Dark Forest | `#173F2B` |
| Warm Orange | `#E99A2B` |
| Off-white | `#F6F2EA` |
| Surface | `#FFFEFB` |

The UI follows a compact, information-focused design with strong offline-readiness indicators, clear hierarchy, and restrained visual clutter.

Detailed front-end rules are documented in [`design.md`](./design.md).

## 🛠️ Technology Stack

### Current implementation

- **Expo SDK 54**
- **React Native 0.81.5**
- **React 19.1**
- **TypeScript 5.9**
- **Expo SQLite** — accounts, sessions, onboarding preferences, download state, itineraries, and safety checklist persistence
- **Expo Crypto** — local prototype password hashing support
- **Expo Vector Icons / Ionicons**
- **React Native Animated API** — landing-page motion without an additional animation dependency
- **Custom HUD / snackbar / toast feedback provider**

### Planned offline tourism integrations

The following are product-direction items and are **not yet fully implemented**:

- Expo Location / device GPS
- Offline map rendering
- MapLibre React Native
- OpenStreetMap-derived map data
- Downloadable JSON destination-pack content
- GeoJSON tourist trails and points of interest
- Local attraction media and richer destination details
- Production tourism-data management or tourism-office content workflow

## 📁 Project Structure

```text
LakbayLokal/
├── App.tsx
├── index.ts
├── app.json
├── design.md
├── README.md
├── assets/
│   ├── logo.png
│   └── logo-mark.png
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
│   ├── feedback/
│   │   └── FeedbackProvider.tsx
│   ├── screens/
│   │   ├── LandingScreen.tsx
│   │   ├── AuthScreen.tsx
│   │   ├── SignupOnboardingScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── ExploreScreen.tsx
│   │   ├── TripsScreen.tsx
│   │   ├── DownloadsScreen.tsx
│   │   └── SafetyScreen.tsx
│   ├── storage/
│   │   ├── authStore.ts
│   │   ├── downloadStore.ts
│   │   ├── itineraryStore.ts
│   │   ├── onboardingStore.ts
│   │   └── safetyStore.ts
│   ├── types/
│   │   └── navigation.ts
│   └── theme.ts
├── package.json
└── tsconfig.json
```

## 🚀 Getting Started

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

Additional commands:

```bash
npm run android
npm run ios
npm run web
```

If local network discovery causes Expo Go connectivity problems, Expo's tunnel mode can also be used during development.

## 🧪 Development Notes

- Keep the project on **Expo SDK 54** unless an upgrade is intentionally planned and tested.
- Follow [`design.md`](./design.md) before introducing new screens or reusable UI patterns.
- Reuse centralized theme values from `src/theme.ts`.
- Keep the landing page and signup onboarding conceptually separate.
- Use the global feedback provider for HUD, snackbar, and toast behavior rather than adding inconsistent per-screen notification systems.
- Preserve guest access to core tourism discovery and preparation features.
- Do not describe destination packs as complete offline maps until actual map/trail files are downloaded and rendered locally.
- The local authentication implementation is suitable for the current prototype only and should be replaced or strengthened before a production deployment involving real user accounts.

---

<p align="center">
  <strong>LakbayLokal</strong><br />
  Explore locally. Prepare before the signal fades.
</p>
