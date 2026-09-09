# Belt-cycling Bot Builder macros

Three Mining-catalog blocks for industrial / mining belt loops. Try them on the fork BFF at **http://localhost:26501** (Bot Builder → Mining).

## `wait-while-asteroids-above`

- **Sentence:** Warp to the nearest belt, then wait while asteroid count is greater than X (done when count ≤ X).
- **Params:** optional `greaterThan` (`count`). Unset = **0** (wait while any mineable rocks remain).
- **Runtime:** warp nearest belt → idle while `mineableRockCount > X` → done.

## `empty-belt-cleanup-next`

- **Sentence:** When the belt is empty: scoop MTUs if possible, recall drones, warp to nearest|random other belt.
- **Params:** optional `mode` (`beltTravel`: `nearest` default, or `random`).
- **Runtime:** while rocks remain → idle; when empty → note MTU scoop gap → `recallBeforeLeaving` → warp to other belt → done on arrival.
- **Limitation:** **No MTU scoop API** in this client (only `ScoopDrone` / `LaunchFromShip`). Deployed MTUs are left on grid with a clear why-line.

## `tractor-loot-jetcans`

- **Sentence:** Activate fitted tractor beams on jetcans and loot ore into the ore hold.
- **Params:** none.
- **Runtime:** requires `tractorModuleIDs` from fit (group name `/tractor beam/i`); lock → activate tractors → approach → `lootContainer` (ore → ore hold via existing transfer split).
- **Distinct from** `deploy-mtu-and-loot` (MTU deploy + in-range loot on industrial support hulls).
