# Routing device verification

Record phone model, OS version, app build/commit, available RAM/storage, pack version, mode, start/destination, result, calculation time, and any screenshot/log relevant to a failure. Desktop checks are already automated; these checks establish behavior on the device.

## Test now: provincial packs and existing navigation

Provincial roads are enabled in the five available destination packs. Install a build containing the new assets, then save/update Panabo (version 6), Tagum (5), Samal (7), Hagimit Falls (5) and Monfort Bat Sanctuary (4) as needed. Use an installed release build for offline cold starts; a development session that needs Metro is not evidence of offline startup. The graph is loaded by region: mainland or Samal. Use a vehicle-accessible local place for driving; Panabo's boardwalk default target currently has no permitted driving route.

1. Disable Wi-Fi and mobile data, leave location services enabled, force-close and reopen the app. Open the downloaded map and verify roads/places render.
2. With an outdoor GPS fix in the shipped coverage area, calculate walking and driving routes to a nearby local place. Check start/end placement, direction, route line and displayed ETA. Repeat with another destination.
3. Compare Direct, Easy, Adventure and Scenic walking choices where the pack offers alternatives. Check that each displayed route reaches its destination; identical choices can be valid when alternatives are absent.
4. Start navigation while stationary, confirm the next instruction and audible guidance. Then follow a short suitable walking route and confirm progress/ETA update without repeated voice announcements.
5. On a suitable route, deliberately take another permitted walking path. Check rerouting and repeat several times, then change the destination and return to the original destination. Look for stale route endpoints, growing delays, freezes or crashes.
6. Route toward the mangrove/trail destination. Verify the road-to-trail handoff and Trail Mode behavior. Confirm the transition is visibly distinct from road guidance.
7. Switch apps and return; lock and unlock the phone. Record whether navigation resumes with current position and instruction. Note observed behavior during poor/lost GPS and after recovery.
8. Repeat route calculations at least 20 times in one app session. Record responsiveness and memory if available. Finish with an offline cold start and repeat the first route.

For driving behavior, operate the app while parked or have a passenger handle it. Record unexpected instructions without following an unsafe or prohibited movement.

## Dynamic navigation reliability gate — device pending

Deterministic automated GPS-trace fixtures now exercise forward travel, stationary jitter, sustained reverse travel, parallel route legs, missed turns, poor accuracy, stale/out-of-order fixes, GPS loss/recovery and reroute cooldowns. These are recorded/simulated test inputs only; they do **not** count as live-GPS or phone verification.

- While stationary outdoors, leave live navigation running for several minutes. Confirm normal GPS drift does not advance route progress, change the active maneuver, repeat voice prompts, or trigger rerouting.
- Walk or drive a suitable route with close parallel roads and multi-leg intersections. Confirm matching stays on the traveled route leg and does not jump forward/backward at crossings. Record the raw GPS accuracy shown by the app.
- Safely travel opposite the active route for long enough to establish sustained movement. Confirm one noisy compass/heading update does not reroute, but continued reverse movement is detected and recalculation occurs once appropriate.
- Deliberately miss a safe turn and continue away from the route. Confirm LakBai waits for several reliable fixes, reroutes once, and does not repeatedly recalculate while the new route is settling.
- Move through an area with degraded GPS or temporarily disable location services, then restore a good fix. Confirm progress, remaining distance/ETA and spoken guidance pause rather than jump, and resume from the recovered position without replaying obsolete instructions.
- If device logs expose delayed or out-of-order location callbacks, confirm older timestamps are ignored. Do not treat simulator-injected coordinates as evidence for this device check.

## Offline discovery gate — device pending

Offline Discovery uses bundled catalog content plus a generated street-name index from the same mainland and Samal routing datasets. Search results and dropped pins are routing references, not automatically verified entrances.

- With airplane mode enabled, search several known place aliases and named roads in Tagum, Panabo, northern mainland municipalities and Samal. Confirm results appear without a network request and opening a street/pin stays inside LakBai.
- Deny foreground location and confirm place/street search, recent targets and saved dropped pins still work. GPS denial should affect distance ordering only.
- Long-press the provincial offline map in both mainland and Samal coverage. Confirm the pin persists after an app restart and remains clearly labeled as a user-selected coordinate.
- Route to a named street and dropped pin. Confirm the navigation screen displays the unverified-target notice and does not imply the coordinate is an entrance, parking area or legal access point.
- Search an alias such as a local/alternate road name and confirm the canonical OSM road name is shown. Record duplicate or ambiguous road-name results rather than assuming one representative point identifies the whole road.
- Verify recent destinations remain device-local and bounded; removing a dropped pin must not remove destination packs, favorites or itineraries.

## Mainland–Samal ferry journey gate — device pending

Automated tests cover mainland→Samal and Samal→mainland road-ferry-road composition, reverse ferry geometry, missing regional graphs, ferry-phase reroute suppression, and preservation of the existing road-only cross-channel rejection. These tests do not establish that the terminals, queues, schedules or service are correct on the day of travel.

- In airplane mode, calculate Panabo/Tagum-area → Samal journeys and the reverse. Confirm the map shows two road legs plus a visually distinct dashed ferry leg, never one continuous road line across Pakiputan Strait.
- Verify the mainland road leg physically reaches the DAVSAM/Km. 13 Panacan terminal access and the Samal road leg resumes from the correct Babak terminal access. Record any gate/driveway mismatch as a terminal-coordinate defect.
- Confirm the UI identifies the crossing as source-reviewed/device-pending and does not claim a live ferry schedule. The displayed 30-minute ferry travel time is the MARINA March 2026 published reference crossing time, not a live ETA; queue/wait time must remain explicitly unknown.
- During an actual ferry crossing, confirm road off-route warnings, wrong-way detection and road rerouting do not repeatedly fire over water. After arrival, confirm normal road matching and rerouting resume on the destination-side graph.
- Test both walking/passenger and vehicle journeys. Follow current operator/port rules; a routable app journey is not evidence that a specific passenger, vehicle type or departure is accepted.
- Disable/remove one regional routing asset in a development build and confirm the journey fails closed rather than drawing a fallback straight route across the channel.
- Verify current ferry operation and terminal access independently before relying on this journey in a field demonstration. Do not describe the ferry journey as live-service-aware or field-verified until these checks are complete.

## Provincial coverage and recovery gate

This gate is ready for device testing. Do not mark it passed from Panabo results or the desktop audit. Six incomplete restriction relations are conservatively excluded by blocking driving on their known approach roads; no missing turn membership was guessed. The engine enforces supported restrictions and conservative barrier rules.

- Offline local walking and driving journeys in Asuncion, Braulio E. Dujali, Carmen, Kapalong, New Corella, Panabo, Samal, San Isidro, Santo Tomas, Tagum and Talaingod.
- Connected mainland cross-boundary journeys, including Panabo–Tagum and Tagum–Talaingod; verify real destination entrances and road access.
- Local Samal journeys work independently. Mainland–Samal road-only routing must still return `ferry-required`; the separate ferry journey must use explicit Panacan/Babak terminal transitions and a distinct water leg rather than a road line across the channel.
- Curved roads, parallel roads and loops: snaps stay on the intended physical segment, and a reverse one-way movement is not offered.
- Known prohibited turns, only-turn junctions, access-restricted segments and barriers are handled according to verified local rules. Compare walking/driving at bollards, public gates and private gates; record conservative exclusions caused by missing access tags. Check that a destination before a barrier is reachable without crossing it.
- Recalculate from midway along the approach road to a restricted junction. Then trigger a reroute after entering a mapped multi-way restricted maneuver and confirm the legal continuation still reflects the approach already traveled. A fresh navigation session started inside the maneuver has no pre-session history and must not invent one.
- On mapped `junction=roundabout` routes, verify the entry prompt, numbered exit, exit road name when available, and spoken instruction against the physical junction. Record mapping errors instead of treating generated exit numbering as field verification.
- Measure cold-load memory, first/warm calculation time, repeated-reroute memory, battery behavior and recovery on the lowest-memory supported device.

A missing result remains unverified. Record the location and failure rather than generalizing one successful journey to a whole municipality.

## Installation, shared files and failed updates

- Save both Panabo and Tagum, then remove one. The other must still route offline. Repeat with two Samal packs. Confirm the app documents contain one checked file per installed region/version, not a graph copy inside each new pack.
- Force-close after saving, disable Wi-Fi/mobile data and reopen. Verify local routing, map rendering and voice guidance without a development server.
- Exercise pack update cancellation/interruption in a test build. The old guide and checked routing data must remain usable; retry must finish without partial files becoming ready. A process interrupted between pack backup and promotion must recover on reopening.
- Upgrade from a build with a saved legacy Panabo pack. Confirm it remains readable, then update the pack and verify the shared dataset reference. For future dataset-version upgrades, test offline fallback to the previous checksum-verified shared copy if installation fails.
- Record storage before/after saves and removals. Shared basemap/routing bytes are included in each pack's reported footprint but physically shared. Older routing versions are retained for rollback, so removing a guide does not reclaim those files.
- Measure first-load and repeated-route responsiveness on a low-memory device. The mainland file is approximately 39.5 MB; desktop success does not establish acceptable mobile memory use.

The source snapshot is 2026-09-27. Existing catalog coordinates and road access still require local verification. A successful route to a catalog point does not verify the named place's entrance.
