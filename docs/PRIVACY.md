# LakBai privacy and local-data notes

LakBai is designed to work without a user account. Core exploration, saved destination
packs, Trips, favorites, Smart Explore recommendations, maps, routing, and navigation
do not require sign-in.

## Data kept on the device

LakBai stores application state locally, including travel preferences, Trips,
favorites, safety-checklist state, saved destination-pack metadata/content, offline
map/routing files, and a limited resumable multi-stop navigation checkpoint.

LakBai does not currently provide account-based cloud backup or cross-device sync.
Removing the app, clearing its application data, or losing the device can therefore
remove locally stored user data.

## Location

LakBai requests foreground location permission for features that need the user's
current position, including Nearby, proximity-aware Smart Explore recommendations,
offline routing, route progress, rerouting, and navigation guidance.

LakBai does not require location permission to browse its bundled destination
information. If permission is denied, features that depend on the current GPS position
are limited while the rest of the local guide remains usable.

The current release does not request background location permission.

## Internet use

Core saved/offline features are designed to work without a network connection.
Features that intentionally open public online research or external source pages
require connectivity and leave the fully offline path.

## Smart Explore

Smart Explore is deterministic application logic. It does not send prompts to a paid
cloud LLM. Recommendations are computed from LakBai's local tourism catalog,
source-review metadata, user-selected preferences, optional current position, and the
offline routing engine.

## Tourism information

LakBai's current tourism review process relies on public Internet sources. A source
review is not a physical field inspection. Time-sensitive details such as fees,
opening hours, transport schedules, ferry arrangements, road conditions, temporary
closures, facilities, and access rules should be confirmed with the destination,
operator, port, or relevant local authority before travel.

## Maps and OpenStreetMap

Road, street, trail, and other geographic data used by LakBai are derived in part from
OpenStreetMap contributors. OpenStreetMap data is made available under the Open Data
Commons Open Database License (ODbL). See https://www.openstreetmap.org/copyright for
the attribution and license terms.

## Accounts

LakBai currently has no account system and therefore has no login or logout flow.
"Restart setup" resets local travel preferences only; it does not delete Trips,
favorites, or downloaded packs.
