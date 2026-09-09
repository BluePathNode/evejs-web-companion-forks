# Fork: Upwell structure home / haul / autopilot docking

## What was fixed

Bots and travel treated only NPC `stationID` as a dock destination. An Upwell
structure (citadel / engineering complex / etc.) reports on `flightStatus.structureID`
instead, so home capture, autopilot arrival, deliver-ore, and hangar sync could
not bind or recognize a structure dock.

Changes (fork only):

1. **`startRoute`** — `kind === "structure"` keeps `destinationStationID` /
   name from resolve (same as a station). Autopilot therefore docks instead of
   "arriving" undocked in-system.
2. **`isAtDestination` / `rideAutopilotTo` / deliver-ore / travel-to-station** —
   compare the planned dock id to `stationID ?? structureID` via
   `dockedLocationID()`.
3. **Custom bot start** — `startingStationID = stationID ?? structureID` when
   docked, so "starting station" / home macros bind to a citadel.
4. **Docked sync** — hangar/panel relocate uses the same docked location id
   (and select-character anchors `stationID ?? structureID`).
5. **MiningBot picker** — on-grid structures are listed; flight-status dock
   location is offered when `StationStatic` is missing (structures are not in
   the NPC station tables).

`CmdDock` is still used with the structure item id (same BFF
`/api/bridge/flight/dock` route). No separate `structureDocking.Dock` bridge
was added; prefer verifying live that CmdDock accepts structure ids before
growing the allowlist.

## How to verify live

1. Dock in your Upwell home (citadel). Start a custom bot whose home / deliver
   target is **Starting station**. Confirm the run binds that structure id
   (readout / deliver destination), not "no station".
2. Undock, run **Mining day** (or deliver-ore / travel-to-station home =
   starting). Confirm the autopilot keeps a dock target for the structure and
   does **not** stop undocked in-system.
3. On arrival, confirm unload / hangar refresh works while docked in the
   structure (`structureID` matches).
4. Optional: Mining bot panel while undocked near the citadel — structure
   should appear under "Take the ore to".

## Out of scope / remaining gaps

- Jump bridges / Ansiblex routing.
- Full StationStatic / station services UI for structures (NPC station tables
  only); hangar inventory still refreshes via docked location sync.
- If live CmdDock refuses structure ids, add a BFF route + client wrapper for
  `structureDocking.Dock` / `.Undock` using the retail inventory allowlist —
  only then.
