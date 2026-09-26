# Fork: UI overhaul (chrome / first screen)

Priority pass after the token polish in `FORK_UI_POLISH.md`. Still not a Bot
Builder rewrite and still not a React island. Goal: the companion should read as
a client the moment the tab opens, not as a centred document with a raw heading.

## What changed

| Surface | Before | After |
| --- | --- | --- |
| First load / restore | Bare `h1` "EveJS Web" in the 72rem `#app` column | Full-viewport `.app-gate` with brand, tagline, starfield wash |
| Character bar brand | Tight "EVEJS" letter-space | Mark + "Companion" stack, hairline divider |
| Pilot chips | "Docked" / "In space" only | Same short words plus system name when known; long station names stay on the title |
| Empty station desktop | One muted paragraph | Card with kicker + instruction |
| Workspace header / Neocom | Flat panel + rail | Slightly stronger head wash and rail spine; state badges filled, not outline-only |
| Window chrome | Unchanged model | Unchanged — still floating, chamfered, glass |

## Files

- `web/src/ui/App.svelte` — gate wrapper for restore + first login
- `web/src/ui/CharacterBar.svelte` — brand stack
- `web/src/ui/CharacterChip.svelte` — system on the short state line
- `web/src/ui/Desktop.svelte` — empty-deck copy
- `web/src/ui/characterChip.test.ts` — allows `Docked · Jita`
- `web/src/styles.css` — gate, bar, empty deck, badges, rail/head wash
- `docs/FORK_UI_OVERHAUL.md` — this note

## What stayed the same

- Svelte 5 shell, Neocom + floating windows, square corners (R53)
- Touch targets, R7d names, `TypeIcon` as the only `<img>`
- Bot Builder block model and runner
- In-tab multibox / quiesce behaviour (`FORK_MULTI_CLIENT.md`)

## How to refresh

1. `npm run build:web` from the fork root.
2. Hard-refresh the companion (`Ctrl+F5`).
3. Confirm login fills the viewport, then a docked empty deck shows the new card.

## Next (not this pass)

Node-canvas Bot Builder on top of the existing `BotScript` JSON, parked in
`docs/goal-prompts/parked-node-bot-editor.md`.
