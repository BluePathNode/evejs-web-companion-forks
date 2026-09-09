# Fleet mining Bot Builder macros

Blocks for Orca/Rorqual boss + miner fleet mining loops. Try them on the fork BFF at **http://localhost:26501** (Bot Builder → Mining / Fleet).

## `empty-belt-home-tether-wait` (Mining)

- **Sentence:** When the belt is empty: recall drones, travel to your bot home (starting structure), undock to tether, then wait.
- **Params:** none (home = `homeStationID` ?? `startingStationID` from the bot run — Upwell/structure-aware via `dockedLocationID`).
- **Runtime:**
  1. Wait while mineable asteroids remain on grid.
  2. Recall drones, autopilot to bot home (docks — same path as deliver-ore / travel-to-station).
  3. Undock at home so an **Upwell tether** can engage (automatic in Eve; no separate tether bridge API).
  4. **Sustained hold** (never completes on its own) until the step is stopped or a watch advances the script.
- **Limitation:** There is no `tether` / `CmdTether` API. NPC station homes undock and idle nearby (no tether). Set bot home or start docked so home resolves.

## `fleet-warp-to-me` (Fleet) — boss

- **Sentence:** Broadcast your position to the fleet so members can warp to you (location ping — not a forced fleet warp). Optional `greaterThan` gate.
- **Params:** optional `greaterThan` (`count`). When set, waits until mineable asteroid count **> X** before broadcasting. Unset = no gate (rely on script composition).
- **Runtime:** require in-fleet + in-space → optional asteroid gate → `SendBroadcast("InPosition", "System", shipItemID, shipTypeID)` → done.
- **Limitation:** EveJS bridge has **no `WarpFleet` / warp-fleet-to-member** method (only `SendBroadcast` / bubble/system broadcasts). This does **not** force miners into warp; miners must run **`fleet-warp-to-broadcast`** (or warp manually from fleet history).

## `fleet-warp-to-broadcast` (Fleet) — miner

- **Sentence:** Wait for the last fleet location broadcast (boss warp-to-me ping), warp to that ship, done on arrival.
- **Params:** none.
- **Runtime:**
  1. Require in-fleet; undock if docked.
  2. Wait until this companion has a **remembered** last `SendBroadcast` for the session fleet (filled when the boss block / any member hits `POST /api/bridge/fleet/broadcast`).
  3. `CmdWarpToStuff` / `warp` to that broadcast `itemID` (boss ship from the ping).
  4. **Done** when that item is on grid after warp (or a fleet-mate is already on grid with no ping yet).
- **How broadcasts are observed:** EveJS has **`fleetObjectHandler.SendBroadcast` only** — no `GetBroadcast`, no fleet-history read, no `OnFleetBroadcast` push in the companion contract. Retail fleet-window “warp to broadcast” is **not** exposed. The fork therefore keeps an in-memory **last broadcast per `fleetID`** on the BFF (`GET /api/bridge/fleet/last-broadcast`) so miners on the same companion can pair with boss `fleet-warp-to-me`.
- **Limitations:**
  - Cache is **per companion process** (same `:26501`); not shared across machines; lost on BFF restart.
  - Warping to an **off-grid ship itemID** via `CmdWarpToStuff` may be refused by beyonce — **live QA owed**. If it fails after bounded tries, the block **blocks** with a clear reason; **manual fleet-history warp-to-broadcast** may still work in the game UI.
  - No true `WarpToMember` / character-based fleet warp.

## Composition

**Boss (example):**

1. Arrive / form fleet as needed (`standing-fleet-boss` / `create-fleet`, …).
2. `wait-while-asteroids-above` (warps nearest belt, waits while count > X — or use X=0 to wait until empty after support work).
3. `fleet-warp-to-me` — **or** put `greaterThan` on `fleet-warp-to-me` itself instead of a separate wait block.
4. `deploy-mtu-and-loot` / compress / etc.

**Miner (example):**

1. Join fleet / undock.
2. `fleet-warp-to-broadcast` — wait for boss ping, warp to boss grid.
3. Mine (`mine-at-belt` …) until empty or until a watch.
4. `empty-belt-home-tether-wait` — return home, tether, hold until a watch advances (or stop the step and run `fleet-warp-to-broadcast` again for the next lap).

Prefer composing boss as `wait-while-asteroids-above` → `fleet-warp-to-me` when the gate is “already on grid and rocks still above X”; use the block’s own `greaterThan` when you want a single block after arrival.

`empty-belt-home-tether-wait` is **sustained** — pair the next lap by advancing with a watch, or use `fleet-warp-to-broadcast` as the “wait for call then warp” step instead of relying on the home hold alone.
