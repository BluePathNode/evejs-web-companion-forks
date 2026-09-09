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

insertAfter(
  "web/src/bots/botScript.ts",
  '| "fleet-warp-to-broadcast"\n',
  '  | "command-bursts-on"\n  | "command-bursts-off"\n  | "industrial-core-on"\n  | "industrial-core-off"\n',
  "MacroID union"
);

insertAfter(
  "web/src/bots/botScript.ts",
  '"fleet-warp-to-broadcast",\n',
  '  "command-bursts-on",\n  "command-bursts-off",\n  "industrial-core-on",\n  "industrial-core-off",\n',
  "MACRO_IDS"
);

insertAfter(
  "web/src/bots/macroSpecs.ts",
  '"fleet-warp-to-broadcast": { args: [], untilRequired: false },\n',
  '  "command-bursts-on": { args: [], untilRequired: false },\n  "command-bursts-off": { args: [], untilRequired: false },\n  "industrial-core-on": { args: [], untilRequired: false },\n  "industrial-core-off": { args: [], untilRequired: false },\n',
  "MACRO_SPECS"
);

insertAfter(
  "web/src/bots/runPolicy.ts",
  '"fleet-warp-to-broadcast": policy(["fleet"]),\n',
  '  "command-bursts-on": policy(["fleet"]),\n  "command-bursts-off": policy(["fleet"]),\n  "industrial-core-on": policy(["fleet"]),\n  "industrial-core-off": policy(["fleet"]),\n',
  "runPolicy"
);

insertAfter(
  "web/src/bots/scriptText.ts",
  'case "fleet-warp-to-broadcast":\n      return "Warp to fleet broadcast";\n',
  '    case "command-bursts-on":\n      return "Command bursts on";\n    case "command-bursts-off":\n      return "Command bursts off";\n    case "industrial-core-on":\n      return "Industrial core on";\n    case "industrial-core-off":\n      return "Industrial core off";\n',
  "macroName"
);

console.log("part A done");