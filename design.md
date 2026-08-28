# LakbayLokal Design System

## 1. Product Design Direction

LakbayLokal uses a **compact, clean, offline-first travel interface**. The UI should feel local and adventurous without becoming decorative or visually noisy.

Design priorities, in order:

1. **Scannability** — users should understand a screen within seconds.
2. **Compactness** — show useful information without oversized cards or excessive spacing.
3. **Offline confidence** — download state, saved content, GPS readiness, and safety information must be easy to identify.
4. **Consistency** — reuse the same spacing, card, typography, icon, and status patterns across all screens.
5. **Calm visual hierarchy** — use color selectively; do not make every element compete for attention.

The app should never look like a generic social network, e-commerce app, or Google Maps clone.

---

## 2. Brand

**Name:** LakbayLokal  
**Tagline:** Go Beyond, Go Lokal.

### Core Colors

| Token | Hex | Usage |
|---|---|---|
| Forest Green | `#1F5B3A` | Primary brand, active navigation, primary buttons |
| Forest Dark | `#173F2B` | High-emphasis text and dark panels |
| Warm Orange | `#E99A2B` | CTA accents, highlights, selected details |
| Off-white | `#F6F2EA` | Main app background |
| Surface | `#FFFEFB` | Cards, sheets, input surfaces |
| Text | `#20362B` | Primary body text |
| Muted | `#68756D` | Secondary text and metadata |
| Border | `#DCE5DD` | Dividers and card/input outlines |
| Soft Green | `#EAF3EB` | Active chips and positive/offline-ready states |
| Soft Orange | `#FFF2E1` | Light emphasis and warning context |
| Danger | `#B84E3C` | Emergency/destructive emphasis only |

### Color Rules

- Forest green is the dominant UI color.
- Warm orange is an accent, not a second dominant background color.
- Keep most screen area off-white or white.
- Prefer borders and tonal backgrounds over shadows.
- Red is reserved for actual safety/emergency states.

---

## 3. Typography

Use the platform/system sans-serif font for performance and zero additional dependency.

| Role | Size | Weight | Notes |
|---|---:|---:|---|
| Display | 28–30 | 800/900 | Rare; hero headline only |
| Screen title | 24 | 800 | Main screen heading |
| Section title | 17–18 | 800 | Major content groups |
| Card title | 15–16 | 700/800 | Destination names and important labels |
| Body | 13–14 | 400/500 | Descriptions |
| Meta | 11–12 | 500/600 | Distances, counts, locations |
| Eyebrow/Label | 10–11 | 700/800 | Uppercase sparingly |

Rules:

- Avoid giant marketing headings inside the app.
- Prefer one strong title and compact supporting text.
- Body copy should normally stay within 1–3 lines.
- Use uppercase only for short status/eyebrow labels.

---

## 4. Spacing

Use a compact 4px-based rhythm.

| Token | Value |
|---|---:|
| `xxs` | 4 |
| `xs` | 6 |
| `sm` | 10 |
| `md` | 14 |
| `lg` | 18 |
| `xl` | 24 |
| `2xl` | 32 |

### Screen Rules

- Standard horizontal gutter: **18px**.
- Major section gap: **20–24px**.
- Card-to-card gap: **10px**.
- Inside compact cards: **12–14px**.
- Do not use empty space as decoration. Every large gap must improve hierarchy.

---

## 5. Shape & Elevation

### Radius

| Element | Radius |
|---|---:|
| Small chip | 999 |
| Input / small card | 12 |
| Standard card | 14 |
| Feature panel | 18 |

### Elevation

- Default: border only (`1px #DCE5DD`).
- Avoid large shadows.
- Use subtle elevation only for persistent bottom navigation when needed.

---

## 6. Icons

Use **Ionicons from `@expo/vector-icons`**.

- Standard icon: 18–20px.
- Navigation icon: 21–22px.
- Feature icon container: 34–40px.
- Use outline icons by default and filled icons for active navigation/state.
- Do not mix icon libraries.
- Icons should support labels, not replace critical text.

---

## 7. Core Components

### App Header

- Height should remain compact.
- Brand lockup on the left; utility/offline indicator on the right.
- Do not repeat the full tagline on every screen.

### Search Field

- 44px minimum height.
- Surface background + 1px border.
- Search icon left; optional filter action right.
- Placeholder should describe destination intent.

### Category Chips

- 34–38px high.
- Selected: soft green background + forest text.
- Unselected: white surface + border.
- Keep labels short.

### Destination Card

Cards should prioritize:

1. Destination/pack name
2. Municipality/location
3. Short summary
4. Compact metadata (spots, trails, pack size)
5. Offline/download state

Avoid full-width photography by default because offline content and data density are more important. A small tonal icon block is preferred until real locally stored imagery is available.

### Status Pills

Use short consistent labels:

- `Offline ready`
- `Available`
- `Coming soon`
- `Needs update`

### Buttons

- Minimum touch height: 44px.
- Primary: forest green fill, white text.
- Secondary: surface fill, forest border/text.
- Accent action: orange only for selected high-value actions.
- Avoid more than one visually dominant button per card/section.

### Bottom Navigation

Initial tabs:

1. Home
2. Explore
3. Downloads
4. Trips
5. Safety

Rules:

- Fixed to bottom.
- Active state = forest green icon + label.
- Inactive = muted gray-green.
- No oversized center button.

---

## 8. Screen Patterns

### Home

Purpose: immediate orientation and quick access.

Order:

1. Compact brand header
2. Search
3. Offline-readiness banner
4. Featured destination packs
5. Quick categories / how-it-works summary

### Explore

Purpose: discover destinations with minimal friction.

Order:

1. Title
2. Search
3. Category chips
4. Result count
5. Compact destination list

### Downloads

Purpose: manage content available without internet.

Order:

1. Storage/readiness summary
2. Downloaded packs
3. Available packs
4. Update/size metadata

### Trips

Purpose: let registered users build personal itineraries from curated LakbayLokal destinations while keeping the plan available offline.

Order:

1. Local-storage readiness note
2. Saved itineraries
3. Create itinerary action
4. Curated destination selection
5. Reorderable itinerary stops with optional time and notes

Guest users may open Trips but must sign in or create an account before creating or managing itineraries. Personal itineraries do not publish new destination information.

### Safety

Purpose: provide calm, immediately readable offline safety information.

Order:

1. Emergency callout
2. Offline checklist
3. Saved emergency information
4. Travel preparation reminders

Do not use alarmist visual language unless a real emergency state exists.

---

## 9. Interaction Principles

- Every pressable element should provide visible pressed feedback.
- Do not hide critical actions behind gestures.
- Search/filter results should update immediately.
- Offline state must remain visible but not intrusive.
- Downloaded content should always be distinguishable from online-only content.
- Use explicit labels rather than ambiguous map/navigation icons alone.

---

## 10. Accessibility

- Minimum interactive target: **44 × 44 px**.
- Maintain readable color contrast.
- Do not communicate state through color alone; pair color with text/icon.
- Keep body text at least 13px where practical.
- Support text wrapping; avoid fixed-height text containers for key information.

---

## 11. Front-End Guardrails

For all future LakbayLokal UI work:

- Follow this file before creating a new screen/component.
- Reuse tokens from `src/theme.ts`; do not hardcode brand colors repeatedly.
- Reuse existing components before creating variants.
- Keep new cards compact and purpose-driven.
- Do not introduce a new color, radius, font family, or spacing scale without updating this document first.
- Do not use paid visual/API dependencies for core UI behavior.
- Keep compatibility with **Expo SDK 54** unless the project baseline is intentionally changed later.
