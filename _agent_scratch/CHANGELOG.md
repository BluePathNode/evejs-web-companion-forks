# Changelog

All notable changes to this EveJS web companion **fork** (vs upstream evejs-web-companion / evejs-web-poc) are documented here.

Keep appending under [Unreleased] for new work; cut a dated SemVer-ish section when you version a release.

Format loosely follows [Keep a Changelog](https://keepachangelog.com/). Dates below are approximate (fork work concentrated around 2026-09-07); prefer accuracy over invented day-level detail.

## [Unreleased]

### Added

- **Fleet macro: `fleet-warp-to-broadcast` (Warp to fleet broadcast)** - Miner pair for `fleet-warp-to-me`: waits for the companion-remembered last `SendBroadcast` (InPosition) for the session fleet, warps to that itemID, done on arrival. Fork BFF cache `GET /api/bridge/fleet/last-broadcast` (EveJS has no GetBroadcast / WarpToMember). See `docs/fleet-mining-macros.md`.

- **Fleet mining macros (2)** — `empty-belt-home-tether-wait` (Mining: empty belt -> bot home/structure -> undock for Upwell tether -> sustained wait) and `fleet-warp-to-me` (Fleet: optional `greaterThan` asteroid gate -> `SendBroadcast` InPosition at boss ship). No WarpFleet / tether APIs; see `docs/fleet-mining-macros.md`.

- **Fleet macro: join-fleet-from-advert (Join a fleet from advert)** - Bot Builder block that lists session-visible fleet-finder adverts, optionally filters by `advertName` substring, and applies via `ApplyToJoinFleet`. Distinct from `join-fleet` (invite wait). Helpers in `web/src/nav/joinFleetFromAdvert.ts`. See `docs/join-fleet-from-advert.md`.

- **Mining belt-cycling macros (3)** — `wait-while-asteroids-above` (warp nearest belt, wait while asteroid count > X; unset X = 0), `empty-belt-cleanup-next` (when empty: note MTU scoop gap, recall drones, warp nearest|random other belt), `tractor-loot-jetcans` (fitted tractor beams → jetcans → ore hold via existing loot path). Helpers in `industrialMiningSupport.ts`; tractor modules resolved in flow. See `docs/belt-cycling-macros.md`.

- **Fleet macro: standing-fleet-boss (Standing Fleet Boss)** — Bot Builder block that forms a fleet (extends Form a fleet), posts a fleet-finder advert with custom name/description, and keeps auto-accepting applicants by corporation, alliance, or standings greater than a threshold. Params: advertName, advertDescription, acceptBy (fleetAcceptBy), optional minStandings (standing). Sustained while the step runs. Helpers in web/src/nav/standingFleetBoss.ts. See docs/standing-fleet-boss.md.

- **Industrial macro: deploy-mtu-and-loot** — Bot Builder block for parked Orca / Porpoise / Rorqual: deploy Mobile Tractor Unit via ship.LaunchFromShip if none on grid, then loot that MTU and jetcans already within loot range (no approach). Ship + stationary gates; helpers in web/src/nav/industrialMiningSupport.ts. See docs/industrial-mtu-loot.md.

- **mine-at-belt ore-family focus** - optional `focus` arg (`rockFocus`) so Bot Builder can say "working the [nearest] [Mercoxit asteroids] at the [nearest belt]". Runtime filters rocks by case-insensitive overview-name substring; default (absent) stays any mineable / nearest. When focused rocks are gone at the belt, blocks like an empty belt (clear reason). Does not restore the removed select/ignore asteroid macros.
- **Fork baseline** Ã¢â‚¬â€ parallel install outside the Eve Offline mods tree so upstream `evejs-web-companion-master` stays untouched. Package `evejs-web-companion-fork` @ `0.1.0`; BFF on **PORT 26501** (upstream companion uses `:26500`); shared `EVEJS_ROOT` / gateway token against the same EveJS server. See README fork blurb and `.env` (`PORT=26501`).
- **Upwell / citadel structure support** for bot home, travel, deliver-ore, and arrival Ã¢â‚¬â€ `dockedLocationID()` (`stationID ?? structureID`); autopilot / `scriptMacros` / flow treat structure docks like stations; MiningBot / StationPicker list on-grid structures and flight-status dock when StationStatic is missing. Documented in `docs/FORK_UPWELL.md`.
- **Industry macro: `deliver-ready-jobs`** Ã¢â‚¬â€ collect finished industry jobs one delivery per tick with re-read confirm (catalog: industry). Install / export job macros still pending (see `docs/block-catalog-brainstorm.md`).
- **Fork docs** Ã¢â‚¬â€ `docs/FORK_UPWELL.md`, `docs/FORK_UI_POLISH.md`; design-system elevation/spacing token notes in `docs/design-system.md`.

### Changed

- **UI polish pass** Ã¢â‚¬â€ quieter borders, shared `--shadow-panel` / `--space-1` through `--space-4`, stronger panel heads, clearer control hover/active, soft focus + themed scrollbars in `web/src/styles.css`; light local style alignment in `BotBuilder.svelte` / `Bots.svelte`. Intent and file list in `docs/FORK_UI_POLISH.md` (pre-polish backup: `web/src/styles.css.bak-polish`).

### Fixed

- **In-tab multibox drops around the 3rd character** — not EventSource starvation (one tab already holds a single SSE). Root cause: shared `MAX_IN_FLIGHT=4` + EveJS edge-owner load from SelectCharacterID while the active cockpit keeps 2 Hz space polls and background bots keep ticking. Fix: `flow.setQuiesced` + App.svelte quiesces the roster during Add Character / refresh restore (pause bots, stop space polls, drop SSE, yield lanes). See `docs/FORK_MULTI_CLIENT.md`.
- **Multi-tab companion drops at ~3 clients** — Chrome shared ~6 HTTP/1.1 connections/origin; each tab EventSource starved polls. Added tabLivePushGate (BroadcastChannel) so only one tab holds SSE. See docs/FORK_MULTI_CLIENT.md.

- **Bot Builder `each_key_duplicate`** Ã¢â‚¬â€ duplicate/clone deep-copies with fresh IDs at every nesting level (`cloneNodeWithFreshIds` in `web/src/bots/scriptEdit.ts`); StationPicker keyed each-blocks use composite `kind:id` keys; MiningBot station/structure picker dedupes overlapping IDs after Upwell so keyed lists do not throw.
- **Module on/off thrash** Ã¢â‚¬â€ `untilLeaving` latch so a flickering `until` cannot re-activate miners mid-leave; null-safe `activeModuleIDs` (wait rather than guess when unknown); repair thermostat OFF half uses `REPAIR_RECOVER_MARGIN = 0.2` hysteresis; repairers matched to the watch layer (`repairersFor`) instead of thrashing unrelated modules (`web/src/nav/scriptDecide.ts`).

### Removed

- **Asteroid select/ignore macros** â€” `select-all-asteroids`, `select-asteroid-by-name`, `deselect-asteroid-by-name`, `ignore-asteroid-by-name` (redundant; no practical way to tell the bot to filter asteroids). Run-board `ignoredAsteroids` / mine-at-belt ignore integration removed with them. Name/type focus now lives on mine-at-belt itself (see Unreleased Added).

### Known gaps / not in this fork yet

- Fleet mining: `fleet-warp-to-me` is a **location broadcast**, not forced WarpFleet (API missing). `empty-belt-home-tether-wait` has no tether verb — Upwell tether is automatic after undock at home.
- Industry: install job / export job macros (deliver-ready only).
- Asteroid filtering: name/type focus shipped on mine-at-belt (`focus` / `rockFocus`); crystal-based filter still not required.
- Industrial MTU: deploy-mtu-and-loot does not approach distant cans (parked support); no atomic deploy-only/loot-only macros yet. **Scooping** deployed MTUs is not available (no scoop-deployable bridge action) — `empty-belt-cleanup-next` notes the gap and continues.
- Upwell: jump bridges / Ansiblex; full StationStatic / structure services UI; live verify CmdDock accepts structure IDs before adding `structureDocking.Dock`.
