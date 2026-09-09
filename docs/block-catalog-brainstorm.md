# Block catalog brainstorm â€” "play the whole game" (2026-07-24)

Every block a player might want, by category, toward fully automated gameplay.
Legend: âœ… shipped Â· ðŸ”Œ plumbed (the BFF call exists; the block is wiring) Â·
ðŸ› ï¸ needs BFF work Â· â“ retail path needs research. Blocks compose on the run
BOARD (facts published for later blocks) exactly like the mission set does.

## 1. Module & ship-state primitives (the combat foundation)
- ðŸ”Œ **Run the shield booster / armor repairer / hull repairer** â€” activate-by-GROUP
  (like miners/salvagers), with a cap floor: run while capacitor > X%, off below.
- ðŸ”Œ **Run the hardeners / damage controls** â€” set-and-forget actives, on at combat start.
- ðŸ”Œ **Speed module (AB/MWD) on/off** â€” on while closing distance, off in orbit/cap-starved.
- ðŸ”Œ **Power modules up/down** (`setModuleOnline` exists) â€” offline the salvager, online the gun.
- â“ **Reload ammo / load a charge** â€” pick charge type per module (crystals, ammo).
- â“ **Overheat a rack** â€” if the heat path is even in eve.js.
- ðŸ”Œ **Cap-stable watchdog** (interrupt): capacitor-below-X% â†’ response (new CONDITION, not a block).

## 2. Targeting & combat
- ðŸ”Œ **Lock the nearest rat / lock by name / lock weakest** â€” lockTarget + pick rules.
- ðŸ”Œ **Engage with guns** â€” activate every weapon-group module on the locked target
  (the mine block's ladder pointed at a rat; weapon groups by name like miners).
- ðŸ”Œ **Fight until the grid is clear** â€” the full loop: lock â†’ guns + drones â†’ next
  target â†’ done when no hostiles (defend-with-drones grown up).
- ðŸ”Œ **Primary-target rules** â€” nearest / smallest (frigates first) / the one shooting me.
- ðŸ”Œ **Flee ifâ€¦** (interrupt responses): warp to safe/home when targeted-by-player,
  when local spikes, when drones lost, when cap dies.
- âœ… Drone attack/recall exist; add **mining drones on a rock** (route exists: drones/mine).

## 3. Fitting & ship management (docked)
- ðŸ”Œ **Fit the ship from a saved fitting** â€” `inventory/fit-fitting` + `strip-fitting`
  routes exist. Args: fitting name. The "reship" primitive.
- ðŸ”Œ **Board ship X** â€” board-by-name from the hangar (openShip/board path exists).
- â“ **Repair ship/modules/drones** at the station repair shop.
- â“ **Insure the ship.**
- ðŸ”Œ **Stack & tidy the hangar** (stack-all exists).
- â“ **Buy missing fitting modules** off market (composes with Â§5's buy block).

## 4. Cargo & logistics
- âœ… unload-cargo, hangarâ†’ore-hold move (UI), mission load/unload.
- ðŸ”Œ **Move N of item X to place Y** â€” the generic transferItems block (args: item picker,
  qty, source, destination). The one block that makes ad-hoc logistics scriptable.
- ðŸ”Œ **Pickup run** â€” visit stations A,B,C (multi-system travel exists), collect all of
  item X from each hangar into cargo, deliver to D.
- â“ **Accept + haul courier CONTRACTS** (contracts are read-only at the gateway today).
- â“ **Jettison / jetcan** (CmdJettison?), abandon-loot route exists.

## 5. Market & trade
- ðŸ”Œ **Buy X (up to price P)** â€” market writes are plumbed (orders, escrow verified).
- ðŸ”Œ **Sell everything of type X (min price P)** / **Sell all minerals**.
- ðŸ”Œ **Restock ammo/drones to N** before undock (buy + move to cargo/bay).
- ðŸ”Œ **Update my orders** (station-trading tick: re-price to top of book with a floor).
- ðŸ”Œ **Wallet conditions** (watch: wallet-above/below â€” condition kind, reads exist).

## 6. Missions & agents (beyond distribution)
- âœ… The 7 distribution blocks.
- â“ **Combat mission runner** â€” accept security mission, warp to the encounter
  (mission bookmarks/coords path needs research), clear pockets (Â§2 blocks), loot/
  salvage (âœ…), turn in. The big one.
- ðŸ”Œ **Mining mission variant** (same agent flow, ore objective).
- ðŸ”Œ **Spend LP in the loyalty store** (rewards/LP reads exist; store write â“).
- ðŸ”Œ **Standings guard** â€” decline-rate limiter already exists conceptually (gateOffer);
  add faction-standing floor condition.

## 7. Mining extras
- âœ… mine/haul/refine loop, belt rotation partial.
- ðŸ”Œ **Mine the biggest rocks first** (survey scan read exists â€” feed the picker).
- ðŸ”Œ **Mine the constellation** â€” rotate BELTS ACROSS SYSTEMS (travel + mine compose).
- â“ **Ice / gas variants** (module groups differ; likely just picker widening).
- â“ **Compress the ore** (if a compression service exists in eve.js).
- ðŸ”Œ **Jetcan mining** pairs with â“ jettison.

## 8. Planetary Industry (R41 planets slice exists)
- â“ **Restart the extractors** â€” the operator's ask; needs the PI program-install write.
- â“ **Collect the launchpad â†’ customs office â†’ haul PI goods home** chain.
- ðŸ”Œ **PI status watch** â€” extractor-expired condition (colony reads exist) â†’ alert/act.

## 9. Industry & science (R15 slice: blueprints/jobs/facilities + action writes)
- ðŸ”Œ **Install a manufacturing job** (blueprint + materials at station).
- ðŸ”Œ **Deliver finished jobs.**
- ðŸ”Œ **Build-from-minerals loop** â€” refine (âœ…) â†’ install â†’ deliver â†’ repeat.
- â“ Copying/invention/reactions â€” depends what the world supports.

## 10. Travel & positioning
- âœ… Multi-system travel/home. 
- ðŸ”Œ **Dock at the nearest station** (panic already computes it â€” make it a block).
- â“ **Warp to a safe spot / bookmark** (bookmark reads? BookmarkNotAvailable refusal
  exists, so bookmarks are in the protocol).
- ðŸ”Œ **Warp to an anomaly** â€” the system-scan gateway bind exists (R72) â†’ scan results
  as warp targets. Opens ratting/anomaly loops.
- â“ **Avoidance routing** (route solver exists; add avoid-list arg).
- â“ **Jump clones.**

## 11. Awareness & alerts (mostly new CONDITIONS + responses, not blocks)
- ðŸ”Œ Conditions: **local count above N**, **player on grid**, **targeted by a player**,
  **cap below X**, **ammo empty**, **drone health low**, **cargo full generic**,
  **wallet above/below**, **time-elapsed** (wait âœ… covers), **missions completed â‰¥ N**.
- ðŸ› ï¸ **Alert the player** response â€” browser notification/sound when a watch fires
  (client-only; no gateway work).
- ðŸ”Œ **Chat watch** â€” local/corp chat reads exist; condition on hostile-in-local by standings â“.

## 12. Program flow & composition
- âœ… Repeat loop, until/watches, wait.
- ðŸ› ï¸ **Run saved bot X as a block** â€” sub-scripts: compose whole bots ("Mining day" =
  run "Belt loop" then "Refine day"). Format + orchestrator work, no gateway.
- ðŸ› ï¸ **Skip-next-if / branch-lite** â€” the HRM model is deliberately branchless; a
  bounded "do block A else B on condition" needs a format decision.
- ðŸ› ï¸ **Named board slots** â€” let a block's arg read "the station block 2 found".

## 13. Fleet & multi-character
- ðŸ”Œ Fleet reads are bound (R72); writes â“ â€” form fleet, invite, fleet-warp, boosts.
- â“ Multi-account orchestration (Orca + barges) â€” a BFF-level feature, not a block.
- **Operator direction (2026-07-24): players on grid are FRIENDLY in this world** â€”
  no PvP-flee default. New fleet-support block ideas: â“ **warp to fleet member**,
  â“ **remote-repair a fleet member's shields/armor**, â“ **remote capacitor
  transfer**, â“ **stay-and-boost** (orbit the fleet member and keep remote reps
  cycling on whoever's hurt) â€” the logistics-pilot loop.

## Operator decisions (kickoff, 2026-07-24)
- Build order: the recommended ladder (Â§1+Â§11 â†’ fight-until-clear â†’ anomaly ratting â†’
  fit/board/restock â†’ move-items â†’ research items).
- BFF: FULL autonomy including restarts (accepting the session drop each restart).
- Format: sub-bot blocks, branch-lite, and named board slots are all approved.
- PvP: players are friendly (dev world) â€” combat blocks ignore players; fleet-support
  blocks above are wanted instead.

## Shipped by the catalog loop (2026-07-24)
âœ… repair watch (thermostat: on hurt / off cap-starved / off healed) + capacitor-below
condition + Watch Capacitor Â· âœ… hardeners-on Â· âœ… fight-the-rats (concentrated fire,
NPC-only per operator decision) Â· âœ… warp-to-anomaly (scanner read + new warp-scan
BFF route â†’ the ratting loop) Â· âœ… refit-ship (board-right-hull + FitFitting by
name, fitting picker) Â· âœ… move-items (generic N-of-X from/to hangar-cargo-orehold)
Â· âœ… warp-to-bookmark (new warp-bookmark BFF route; name-matched, in-system) Â·
âœ… find-combat-agent + fly-to-mission-site ("Agent Missions" folder auto-pick,
prefers the coordinates bookmark) + accept gate made mission-kind-aware â†’ the FULL
security-mission chain is wireable Â· âœ… restart-extractors (UserUpdateNetwork
INSTALLPROGRAM 13 on each expired ECU, same resource, server-clock expiries â€” the
PI ask). Two BFF restarts performed under the full-autonomy grant.

## Suggested build order (value Ã· effort)
1. **Module primitives + conditions** (Â§1, Â§11 conditions) â€” unlocks combat AND safer
   mining (rep-when-shot), nearly all ðŸ”Œ.
2. **Fight-until-clear** (Â§2) â€” with Â§1 done, this is the defend block grown up; with
   the system-scan warp (Â§10) it becomes an anomaly-ratting loop.
3. **Fit-from-saved + board-ship + restock** (Â§3, Â§5) â€” the "reship and go" morning block.
4. **Generic move-items block** (Â§4) â€” one block, endless logistics scripts.
5. **Combat missions** (Â§6) â€” the flagship; needs the encounter-warp research first.
6. **PI restart** (Â§8) â€” high player value; gated on the PI write being plumbed.

## Asteroid filtering (fork note)

Select/ignore-by-name macros were removed from this fork (redundant with no practical filter UX). Rethink later: crystal / type-group / name filtering — not as the old shipped macros.
