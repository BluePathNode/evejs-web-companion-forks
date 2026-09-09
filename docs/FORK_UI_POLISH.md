# Fork: UI polish pass (shared tokens / chrome)

Focused visual polish on the EveJS web companion **fork** only. Not a redesign,
not Electron/Tauri, not a Bot Builder IA rewrite. Goal: hard-refresh :26501
and the shell feels tighter and more intentional without learning a new UI.

## Intent (before -> after)

| Area | Before | After |
| --- | ------ | ----- |
| Borders | Harsh steel lines on every frame | Quieter line tokens + color-mix edges |
| Depth | Mostly flat panels / windows | Shared `--shadow-panel`; softer window shadows |
| Corners | Square (R53) -- correct EVE signal | Still square; Bot Builder/Bots px radii -> tokens |
| Spacing | Mixed ad-hoc rem gaps | `--space-1`..`4` rhythm on panels/tabs/work chrome |
| Hierarchy | Panel heads close to body weight | Stronger head wash, quieter dividers |
| Controls | Secondary/primary similar hover energy | Clearer hover/active; quieter `.minor` |
| Focus / scroll | Outline only; default OS scrollbars | Soft focus glow; thin themed scrollbars |
| Bots chrome | Local rounded cards / uneven borders | Inherit tokens; square + softer inset cards |

## Files changed

- `web/src/styles.css` -- tokens + base/components chrome (main lever)
- `web/src/ui/BotBuilder.svelte` -- light local style alignment to tokens
- `web/src/ui/Bots.svelte` -- light local style alignment to tokens
- `docs/FORK_UI_POLISH.md` -- this note
- `docs/design-system.md` -- token table note for elevation/spacing

**Do not** modify upstream under `Eve Offline/.../mods/evejs-web-companion-master`.

## What stayed deliberately the same

- EVE-ish dark industrial palette (cool near-black, restrained accent)
- Square corners (R53 / `squareCorners.test.ts`)
- Panel semantics, Neocom IA, Bot Builder block model
- Touch targets >=40px (R8)

## How to refresh

1. From the fork root: `npm run build:web` (and `npm run typecheck` if separate).
2. Keep/restart the web client on `:26501` as usual (`StartWebClient.bat` or existing process).
3. Browser **hard refresh** (Ctrl+F5 / Cmd+Shift+R) so dist CSS is not cached.

## Rollback

A pre-polish copy may exist as `web/src/styles.css.bak-polish`; delete once happy.
