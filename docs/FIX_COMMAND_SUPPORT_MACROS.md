# Fix: missing command-burst / industrial-core macros

`tsc` fails because `SCRIPT_MACROS` is typed as every `MacroID`, and four IDs
were added to the catalog without deciders:

- `command-bursts-on`
- `command-bursts-off`
- `industrial-core-on`
- `industrial-core-off`

## 1. Pull the new decider file

`web/src/nav/scriptMacroCommandSupport.ts` is already on `ui-overhaul`.

## 2. Edit `web/src/nav/scriptDecide.ts`

After the `scriptConditions.ts` import, add:

```ts
import {
  commandBurstsOff,
  commandBurstsOn,
  industrialCoreOff,
  industrialCoreOn,
} from "./scriptMacroCommandSupport.ts";

const SUPPORT_MACROS: Partial<Record<MacroID, MacroDecider>> = {
  "command-bursts-on": commandBurstsOn,
  "command-bursts-off": commandBurstsOff,
  "industrial-core-on": industrialCoreOn,
  "industrial-core-off": industrialCoreOff,
};
```

Change the production registry type to:

```ts
export type CompleteMacroRegistry = Readonly<Record<MacroID, MacroDecider>>
  | Readonly<Partial<Record<MacroID, MacroDecider>>>;
```

Change the lookup from:

```ts
const decider = registry[step.macro];
```

to:

```ts
const decider = registry[step.macro] ?? SUPPORT_MACROS[step.macro];
```

## 3. Re-run setup

`SetupWebClient.bat`
