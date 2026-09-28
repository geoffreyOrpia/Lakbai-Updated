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

## Provincial coverage and recovery gate

This gate is ready for device testing. Do not mark it passed from Panabo results or the desktop audit. Six incomplete restriction relations are conservatively excluded by blocking driving on their known approach roads; no missing turn membership was guessed. The engine enforces supported restrictions and conservative barrier rules.

- Offline local walking and driving journeys in Asuncion, Braulio E. Dujali, Carmen, Kapalong, New Corella, Panabo, Samal, San Isidro, Santo Tomas, Tagum and Talaingod.
- Connected mainland cross-boundary journeys, including Panabo–Tagum and Tagum–Talaingod; verify real destination entrances and road access.
- Local Samal journeys work independently. Mainland–Samal must remain unavailable until verified ferry legs are modeled; no line across water.
- Curved roads, parallel roads and loops: snaps stay on the intended physical segment, and a reverse one-way movement is not offered.
- Known prohibited turns, only-turn junctions, access-restricted segments and barriers are handled according to verified local rules. Compare walking/driving at bollards, public gates and private gates; record conservative exclusions caused by missing access tags. Check that a destination before a barrier is reachable without crossing it.
- Recalculate from midway along the approach road to a restricted junction. Also record the behavior of a reroute starting inside a multi-way restricted maneuver: prior traversal history is not yet reconstructed.
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
