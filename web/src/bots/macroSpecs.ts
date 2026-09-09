// The structural spec of each macro — which arguments it takes and whether it
// must carry an `until`. Shared so the codec (which REFUSES a bad file) and the
// editor's validator (which LISTS a draft's fixable problems) can never disagree
// about what a macro needs. The runtime behaviour of each macro is separate
// (nav/macros, slice B).

import type { Arg, MacroID } from "./botScript.ts";

export interface MacroArgSpec {
  readonly key: string;
  readonly kind: Arg["kind"];
  readonly required: boolean;
}

export interface MacroSpec {
  readonly args: readonly MacroArgSpec[];
  /** mine-at-belt has no end of its own; it is invalid without an `until`. */
  readonly untilRequired: boolean;
}

export const MACRO_SPECS: Readonly<Record<MacroID, MacroSpec>> = {
  undock: { args: [], untilRequired: false },
  "travel-to-station": {
    args: [{ key: "station", kind: "station", required: true }],
    untilRequired: false,
  },
  // Same belt arg as mine-at-belt (a pinned one, or "nearest") — just the trip,
  // no mining. For a hauler heading to a belt to pick up a jetcan a mining
  // loop dropped there, without ever sitting down to mine itself.
  "travel-to-belt": {
    args: [{ key: "belt", kind: "belt", required: true }],
    untilRequired: false,
  },
  "mine-at-belt": {
    args: [
      { key: "belt", kind: "belt", required: true },
      // Optional: left unset, the bot runs every mining module fitted, so the
      // player never has to pick equipment (belt auto-resolves to nearest too).
      { key: "equipment", kind: "equipment", required: false },
      // Optional: absent = "nearest", the shipped behaviour.
      { key: "pick", kind: "rockPick", required: false },
      // Optional: absent = any mineable rock. Narrows the pick to an ore family
      // by overview name (case-insensitive substring).
      { key: "focus", kind: "rockFocus", required: false },
    ],
    untilRequired: true,
  },
  "deliver-ore": {
    args: [{ key: "station", kind: "station", required: true }],
    untilRequired: false,
  },
  "defend-with-drones": { args: [], untilRequired: false },
  // ── The distribution-mission set. Every arg is OPTIONAL by design: the find
  // block defaults to level 1 / any corp / any distance, and the later blocks
  // default to the agent/mission the find block published on the run's board —
  // so a bare wired-up chain of blocks is valid out of the box.
  "find-distribution-agent": {
    args: [
      { key: "level", kind: "count", required: false },
      { key: "maxJumps", kind: "count", required: false },
      { key: "corporation", kind: "corp", required: false },
    ],
    untilRequired: false,
  },
  "request-mission": {
    args: [{ key: "agent", kind: "agent", required: false }],
    untilRequired: false,
  },
  "accept-mission": {
    args: [{ key: "maxJumps", kind: "count", required: false }],
    untilRequired: false,
  },
  "load-mission-cargo": { args: [], untilRequired: false },
  "travel-to-dropoff": { args: [], untilRequired: false },
  "turn-in-mission": { args: [], untilRequired: false },
  "return-to-agent": { args: [], untilRequired: false },
  // A plain delay between blocks (defaults to 10 s when unset). The `until`
  // stays optional: "wait until shields are back above X" is `wait` + until.
  wait: { args: [{ key: "seconds", kind: "count", required: false }], untilRequired: false },
  // Docked: move EVERYTHING in the ship's cargo hold into the station hangar —
  // clears room before an accept-mission, tidies up after a lap.
  "unload-cargo": { args: [], untilRequired: false },
  // Sweep the grid's wrecks with salvage drones and/or fitted salvagers; done
  // when nothing salvageable is left. Loot only touches YOUR OWN wrecks.
  "salvage-wrecks": { args: [], untilRequired: false },
  "loot-wrecks": { args: [], untilRequired: false },
  // Empties every container on the grid — jetcans included. No ownership check.
  "loot-containers": { args: [], untilRequired: false },
  // Docked: run every ore stack in the station hangar through the refinery.
  "refine-ore": { args: [], untilRequired: false },
  // One press at the top of a fight/mine: switch every fitted hardener and
  // damage control on. Done when they are all running.
  "hardeners-on": { args: [], untilRequired: false },
  // Guns + drones on the nearest rat, next rat when it dies; done when the grid
  // is clear and the drones are home. Its own end, so no until required.
  "fight-the-rats": { args: [], untilRequired: false },
  // Warp to the next unvisited combat anomaly in this system (the scanner's own
  // list). Done on arrival; blocked when the system has none left this run.
  "warp-to-anomaly": { args: [], untilRequired: false },
  // Docked: board a hull of the fitting's ship type if needed, then apply the
  // saved fitting — the "reship and go" block.
  "refit-ship": {
    args: [{ key: "fitting", kind: "fitting", required: true }],
    untilRequired: false,
  },
  // Docked: move an item between the hangar and the ship's holds. `amount`
  // absent = move ALL of that item.
  "move-items": {
    args: [
      { key: "item", kind: "itemType", required: true },
      { key: "from", kind: "place", required: true },
      { key: "to", kind: "place", required: true },
      { key: "amount", kind: "count", required: false },
    ],
    untilRequired: false,
  },
  // In space, in the bookmark's system: warp to a saved spot (a mission site, a
  // safe spot). Done once the warp lands.
  "warp-to-bookmark": {
    args: [{ key: "bookmark", kind: "bookmark", required: true }],
    untilRequired: false,
  },
  // The combat twin of find-distribution-agent: same criteria, security agents.
  "find-combat-agent": {
    args: [
      { key: "level", kind: "count", required: false },
      { key: "maxJumps", kind: "count", required: false },
      { key: "corporation", kind: "corp", required: false },
    ],
    untilRequired: false,
  },
  // Warp to the accepted mission's own site (its "Agent Missions" bookmark).
  "fly-to-mission-site": { args: [], untilRequired: false },
  // Restart every EXPIRED extractor program across all colonies, reusing each
  // extractor's own last resource. Runs from anywhere (PI is remote).
  "restart-extractors": { args: [], untilRequired: false },
  // Collect every finished industry job (status "ready"), one deliver per tick.
  // Works from anywhere - delivery only ever gives; confirmed by the next jobs re-read.
  "deliver-ready-jobs": { args: [], untilRequired: false },
  // Docked: quote the active ship + its fitted modules at the repair shop and
  // fix whatever is damaged (the station charges the wallet).
  "repair-ship": { args: [], untilRequired: false },
  // ── The market set (docked). Every arg is REQUIRED: an order with no item,
  // no price or (for a buy) no quantity is meaningless, so the block will not
  // start until they are set. Prices are ISK per unit; the server confirm-gates
  // every order and charges the broker fee.
  "buy-item": {
    args: [
      { key: "item", kind: "itemType", required: true },
      { key: "quantity", kind: "qty", required: true },
      { key: "price", kind: "isk", required: true },
    ],
    untilRequired: false,
  },
  "sell-item": {
    args: [
      { key: "item", kind: "itemType", required: true },
      { key: "price", kind: "isk", required: true },
    ],
    untilRequired: false,
  },
  // ── The fleet-support set (in space). Both argless: they read the grid and the
  // fitted remote reps, so there is nothing to pick.
  //   • remote-rep is reactive — done once no friendly on grid is hurt.
  //   • orbit-and-boost is sustained — it stays on the fleet and never ends on
  //     its own (stopped by a watch or by hand), so no `until` is forced.
  "remote-rep": { args: [], untilRequired: false },
  "orbit-and-boost": { args: [], untilRequired: false },
  // ── The fleet-management set (multibox alt-fleeting). create/join are argless;
  // invite names WHO to bring in (a character from your known-pilots roster).
  "create-fleet": { args: [], untilRequired: false },
  "invite-to-fleet": {
    args: [{ key: "who", kind: "character", required: true }],
    untilRequired: false,
  },
  "join-fleet": { args: [], untilRequired: false },
  "join-fleet-from-advert": {
    args: [{ key: "advertName", kind: "text", required: false }],
    untilRequired: false,
  },
  // ── Standing Fleet Boss: form fleet + fleet-finder advert + auto-accept rule.
  // Sustained while the step runs (like orbit-and-boost). Name/description required;
  // acceptBy picks corp/alliance/standings; minStandings matters for standings mode.
  "standing-fleet-boss": {
    args: [
      { key: "advertName", kind: "text", required: true },
      { key: "advertDescription", kind: "text", required: true },
      { key: "acceptBy", kind: "fleetAcceptBy", required: true },
      { key: "minStandings", kind: "standing", required: false },
    ],
    untilRequired: false,
  },
  // ── The PvP set (in space). `only` is OPTIONAL by design: left unset, any
  // player ship is a target; set, the block hunts that one pilot alone.
  "attack-player": {
    args: [{ key: "only", kind: "character", required: false }],
    untilRequired: false,
  },
  // hunt-player roams from where it starts: `maxJumps` bounds how far from that
  // starting system it may wander (default 3), `range` is the directional
  // scanner's reach in AU (default 14, the scanner's own full reach).
  "hunt-player": {
    args: [
      { key: "only", kind: "character", required: false },
      { key: "maxJumps", kind: "count", required: false },
      { key: "range", kind: "count", required: false },
    ],
    untilRequired: false,
  },
  // ── Social. Both args REQUIRED: a message with no words or no channel is
  // meaningless, so the block will not start until they are set.
  "send-chat": {
    args: [
      { key: "channel", kind: "chatChannel", required: true },
      { key: "message", kind: "text", required: true },
    ],
    untilRequired: false,
  },
  // ── Movement extras.
  // set-destination points the autopilot at a station OR a whole system and is
  // done once the trip is under way — it does not wait for the arrival, so a
  // player can follow it with their own checks. The destination is required:
  // there is nothing to set without one.
  "set-destination": {
    args: [{ key: "destination", kind: "destination", required: true }],
    untilRequired: false,
  },
  // Argless: "nearest" is computed from the grid at run time, which is the whole
  // point (a station picked now would not be the nearest one later).
  "dock-at-nearest": { args: [], untilRequired: false },
  // ── Fleet support: same shape as remote-rep, argless for the same reason.
  "remote-cap": { args: [], untilRequired: false },
  // ── Cargo extras. Jettison takes an OPTIONAL item filter: absent = the whole
  // cargo hold goes into the can, set = only that item type.
  "jettison-cargo": {
    args: [{ key: "item", kind: "itemType", required: false }],
    untilRequired: false,
  },
  // Same optional item filter as jettison-cargo, but empties the ORE hold (or
  // whichever specialty hold — ice, gas — the ship has) instead of the cargo
  // hold: a mining ship's hold, not its otherwise-empty cargo bay.
  "jettison-ore": {
    args: [{ key: "item", kind: "itemType", required: false }],
    untilRequired: false,
  },
  "tidy-hangar": { args: [], untilRequired: false },
  // ── Mining extra. Argless: the facility is whatever support ship is on grid
  // (its range is the server's check, and "which one" can only be answered at run
  // time), and the ore is whatever is in the hold.
  "compress-ore": { args: [], untilRequired: false },
  // Stationary Orca/Porpoise/Rorqual: deploy MTU if needed, loot MTU + in-range jetcans.
  "deploy-mtu-and-loot": { args: [], untilRequired: false },
  // Warp nearest belt; wait while asteroid count stays greater than X.
  // Absent greaterThan => 0 (wait while any rocks remain). Codec count min is 1
  // when set; leave unset for the zero threshold.
  "wait-while-asteroids-above": {
    args: [{ key: "greaterThan", kind: "count", required: false }],
    untilRequired: false,
  },
  // When the belt is empty: scoop MTUs (if API allows), recall drones, warp next.
  "empty-belt-cleanup-next": {
    args: [{ key: "mode", kind: "beltTravel", required: false }],
    untilRequired: false,
  },
  // Fitted tractor beams pull jetcans, then loot ore into the ore hold.
  "tractor-loot-jetcans": { args: [], untilRequired: false },
  // Empty belt → bot home (Upwell-aware) → undock for tether → hold.
  "empty-belt-home-tether-wait": { args: [], untilRequired: false },
  // Boss: optional asteroid gate, then fleet location broadcast (not forced WarpFleet).
  "fleet-warp-to-me": {
    args: [{ key: "greaterThan", kind: "count", required: false }],
    untilRequired: false,
  },
  // Miner: wait for last fleet location broadcast (boss fleet-warp-to-me), warp to it.
  "fleet-warp-to-broadcast": { args: [], untilRequired: false },
  "command-bursts-on": { args: [], untilRequired: false },
  "command-bursts-off": { args: [], untilRequired: false },
  "industrial-core-on": { args: [], untilRequired: false },
  "industrial-core-off": { args: [], untilRequired: false },
  "launch-scan-probes": { args: [], untilRequired: false },
  "analyze-signatures": { args: [], untilRequired: false },
  "recover-scan-probes": { args: [], untilRequired: false },
};
