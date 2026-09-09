const fs = require("fs");
const path = require("path");
const root = "C:/Users/Astap/Documents/Eve-Dev/evejs-web-companion-fork";
function read(rel){ return fs.readFileSync(path.join(root, rel), "utf8"); }
function write(rel, t){ fs.writeFileSync(path.join(root, rel), t, "utf8"); }
function insertAfter(rel, anchor, insert, label){
  const src = read(rel);
  const i = src.indexOf(anchor);
  if (i < 0) throw new Error("MISSING anchor in " + rel + ": " + label + " :: " + JSON.stringify(anchor));
  if (src.indexOf(anchor) !== src.lastIndexOf(anchor)) console.warn("WARN multi", rel, label);
  write(rel, src.slice(0, i + anchor.length) + insert + src.slice(i + anchor.length));
  console.log("OK", rel, label);
}
function replaceOnce(rel, from, to, label){
  const src = read(rel);
  const i = src.indexOf(from);
  if (i < 0) throw new Error("MISSING in " + rel + ": " + label + " :: " + JSON.stringify(from.slice(0,120)));
  if (src.indexOf(from) !== src.lastIndexOf(from)) console.warn("WARN multi", rel, label);
  write(rel, src.slice(0, i) + to + src.slice(i + from.length));
  console.log("OK", rel, label);
}

// scriptText sentences
insertAfter(
  "web/src/bots/scriptText.ts",
  'case "fleet-warp-to-broadcast":\n      return "Wait for the last fleet location broadcast (boss warp-to-me ping), warp to that ship, done on arrival";\n',
  '    case "command-bursts-on":\n      return "Activate every fitted Command Burst (including Mining Foreman bursts)";\n' +
  '    case "command-bursts-off":\n      return "Deactivate every fitted Command Burst";\n' +
  '    case "industrial-core-on":\n      return "Activate the fitted industrial core (Medium / Large / Capital)";\n' +
  '    case "industrial-core-off":\n      return "Deactivate the industrial core and wait until it is fully offline";\n',
  "sentences"
);

// catalog
insertAfter(
  "web/src/bots/macroCatalogView.ts",
  '"Being in a fleet, in space; a recent boss fleet-warp-to-me broadcast on this companion",\n  ),\n',
  '  "command-bursts-on": entry(\n' +
  '    "command-bursts-on",\n' +
  '    "fleet",\n' +
  '    "Switches on every fitted Command Burst module — Shield, Armor, Information, Skirmish, and Mining Foreman bursts. Finishes once they are all running.",\n' +
  '    "Command Burst modules fitted; being in space",\n' +
  '  ),\n' +
  '  "command-bursts-off": entry(\n' +
  '    "command-bursts-off",\n' +
  '    "fleet",\n' +
  '    "Switches off every fitted Command Burst module. Finishes once none are still running.",\n' +
  '    "Command Burst modules fitted; being in space",\n' +
  '  ),\n' +
  '  "industrial-core-on": entry(\n' +
  '    "industrial-core-on",\n' +
  '    "mining",\n' +
  '    "Activates the fitted industrial core (Medium / Large / Capital — Porpoise, Orca, or Rorqual). Does not touch dread Siege or Triage modules.",\n' +
  '    "An Industrial Core fitted; being in space",\n' +
  '  ),\n' +
  '  "industrial-core-off": entry(\n' +
  '    "industrial-core-off",\n' +
  '    "mining",\n' +
  '    "Deactivates the industrial core, then waits until it leaves the ship active-module list (the siege/offline cycle). There is no separate seconds-remaining timer in EveJS beyond that.",\n' +
  '    "An Industrial Core fitted; being in space",\n' +
  '  ),\n',
  "catalog"
);

// ScriptObservation fields
insertAfter(
  "web/src/nav/scriptConditions.ts",
  'readonly tractorModuleIDs?: readonly number[];\n',
  '  /** Fitted Command Burst modules (SDE group "Command Burst"), incl. Mining Foreman. */\n' +
  '  readonly commandBurstModuleIDs?: readonly number[];\n' +
  '  /** Fitted Industrial Cores (Siege Module group + type name /industrial core/i). */\n' +
  '  readonly industrialCoreModuleIDs?: readonly number[];\n',
  "ScriptObservation"
);

// flow.ts — extend resolveDefenseModuleIDs
replaceOnce(
  "web/src/app/flow.ts",
  `function resolveDefenseModuleIDs(): {
    readonly shield: readonly number[];
    readonly armor: readonly number[];
    readonly hull: readonly number[];
    readonly hardeners: readonly number[];
    readonly weapons: readonly number[];
    readonly tackle: readonly number[];
    readonly webs: readonly number[];
    readonly tractors: readonly number[];
  } {
    const fit = store.fitting.get();
    const shield: number[] = [];
    const armor: number[] = [];
    const hull: number[] = [];
    const hardeners: number[] = [];
    const weapons: number[] = [];
    const tackle: number[] = [];
    const webs: number[] = [];
    const tractors: number[] = [];`,
  `function resolveDefenseModuleIDs(): {
    readonly shield: readonly number[];
    readonly armor: readonly number[];
    readonly hull: readonly number[];
    readonly hardeners: readonly number[];
    readonly weapons: readonly number[];
    readonly tackle: readonly number[];
    readonly webs: readonly number[];
    readonly tractors: readonly number[];
    readonly commandBursts: readonly number[];
    readonly industrialCores: readonly number[];
  } {
    const fit = store.fitting.get();
    const shield: number[] = [];
    const armor: number[] = [];
    const hull: number[] = [];
    const hardeners: number[] = [];
    const weapons: number[] = [];
    const tackle: number[] = [];
    const webs: number[] = [];
    const tractors: number[] = [];
    const commandBursts: number[] = [];
    const industrialCores: number[] = [];`,
  "defense locals+sig"
);

replaceOnce(
  "web/src/app/flow.ts",
  `        const group = resolved[nameKey("typeGroup", slot.module.typeID)] ?? null;
        if (group === null) {
          continue; // cannot tell what it is — never run a mystery module
        }
        // Anchored: "Shield Booster" / "Ancillary Shield Booster" only.`,
  `        const group = resolved[nameKey("typeGroup", slot.module.typeID)] ?? null;
        const typeName = resolved[nameKey("type", slot.module.typeID)] ?? null;
        if (group === null) {
          continue; // cannot tell what it is — never run a mystery module
        }
        // Anchored: "Shield Booster" / "Ancillary Shield Booster" only.`,
  "typeName in defense loop"
);

replaceOnce(
  "web/src/app/flow.ts",
  `        } else if (/tractor beam/i.test(group)) {
          // "Tractor Beam" / variants — pull jetcans without deploying an MTU.
          tractors.push(slot.module.itemID);
        } else if (slot.family === "high" && /weapon|launcher|turret/i.test(group)) {`,
  `        } else if (/tractor beam/i.test(group)) {
          // "Tractor Beam" / variants — pull jetcans without deploying an MTU.
          tractors.push(slot.module.itemID);
        } else if (/^command burst$/i.test(group)) {
          // SDE group "Command Burst" — Shield/Armor/Info/Skirmish/Mining Foreman.
          // Anchored so "Burst Jammer" / similar names never match.
          commandBursts.push(slot.module.itemID);
        } else if (
          /^siege module$/i.test(group) &&
          typeName !== null &&
          /industrial core/i.test(typeName)
        ) {
          // Siege Module also holds dread Siege / Triage — type name gates
          // Medium/Large/Capital Industrial Core only (Porpoise/Orca/Rorqual).
          industrialCores.push(slot.module.itemID);
        } else if (slot.family === "high" && /weapon|launcher|turret/i.test(group)) {`,
  "burst+core matchers"
);

replaceOnce(
  "web/src/app/flow.ts",
  "return { shield, armor, hull, hardeners, weapons, tackle, webs, tractors };",
  "return { shield, armor, hull, hardeners, weapons, tackle, webs, tractors, commandBursts, industrialCores };",
  "defense return"
);

replaceOnce(
  "web/src/app/flow.ts",
  `    /** Tractor beams (group name /tractor beam/i) — jetcan pull. */
    readonly tractors: readonly number[];
  }`,
  `    /** Tractor beams (group name /tractor beam/i) — jetcan pull. */
    readonly tractors: readonly number[];
    /** Command Burst group (incl. Mining Foreman Burst). */
    readonly commandBursts: readonly number[];
    /** Industrial Core modules (Siege Module + type name /industrial core/i). */
    readonly industrialCores: readonly number[];
  }`,
  "DefenseModuleIDs iface"
);

replaceOnce(
  "web/src/app/flow.ts",
  `          tractorModuleIDs: capabilities.defense.tractors,
`,
  `          tractorModuleIDs: capabilities.defense.tractors,
          commandBurstModuleIDs: capabilities.defense.commandBursts,
          industrialCoreModuleIDs: capabilities.defense.industrialCores,
`,
  "obs wire"
);

console.log("part B done");