# Routing device verification

Record phone model, OS version, app build/commit, available RAM/storage, pack version, mode, start/destination, result, calculation time, and any screenshot/log relevant to a failure. Desktop checks are already automated; these checks establish behavior on the device.

## Test now: shipped Panabo pack regressions

The province-wide compact graph is a build candidate, not enabled in the app yet. These checks exercise the existing shipped pack with the improved shared index and reroute overlays. Install/download the Panabo pack while online before disconnecting. Use a development/release build installed on the device; an offline cold start must not depend on Metro.

1. Disable Wi-Fi and mobile data, leave location services enabled, force-close and reopen the app. Open the downloaded map and verify roads/places render.
2. With an outdoor GPS fix in the shipped coverage area, calculate walking and driving routes to a nearby local place. Check start/end placement, direction, route line and displayed ETA. Repeat with another destination.
3. Compare Direct, Easy, Adventure and Scenic walking choices where the pack offers alternatives. Check that each displayed route reaches its destination; identical choices can be valid when alternatives are absent.
4. Start navigation while stationary, confirm the next instruction and audible guidance. Then follow a short suitable walking route and confirm progress/ETA update without repeated voice announcements.
5. On a suitable route, deliberately take another permitted walking path. Check rerouting and repeat several times, then change the destination and return to the original destination. Look for stale route endpoints, growing delays, freezes or crashes.
6. Route toward the mangrove/trail destination. Verify the road-to-trail handoff and Trail Mode behavior. Confirm the transition is visibly distinct from road guidance.
7. Switch apps and return; lock and unlock the phone. Record whether navigation resumes with current position and instruction. Note observed behavior during poor/lost GPS and after recovery.
8. Repeat route calculations at least 20 times in one app session. Record responsiveness and memory if available. Finish with an offline cold start and repeat the first route.

For driving behavior, operate the app while parked or have a passenger handle it. Record unexpected instructions without following an unsafe or prohibited movement.

## Later gate: provincial candidate activation

Do not mark this gate passed from Panabo regression results. It becomes actionable after a build explicitly enables provincial data and enforces restrictions/barriers.

- Offline local walking and driving journeys in Asuncion, Braulio E. Dujali, Carmen, Kapalong, New Corella, Panabo, Samal, San Isidro, Santo Tomas, Tagum and Talaingod.
- Connected mainland cross-boundary journeys, including Panabo–Tagum and Tagum–Talaingod; verify real destination entrances and road access.
- Local Samal journeys work independently. Mainland–Samal must remain unavailable until verified ferry legs are modeled; no line across water.
- Curved roads, parallel roads and loops: snaps stay on the intended physical segment, and a reverse one-way movement is not offered.
- Known prohibited turns, access-restricted segments and barriers are handled according to verified local rules.
- Measure cold-load memory, first/warm calculation time, repeated-reroute memory, battery behavior and recovery on the lowest-memory supported device.

A missing result remains unverified. Record the location and failure rather than generalizing one successful journey to a whole municipality.
