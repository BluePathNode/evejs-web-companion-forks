const fs = require("fs");
const path = require("path");
const root = "C:\\Users\\Astap\\Documents\\Eve-Dev\\evejs-web-companion-fork";

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}
function write(rel, text) {
  fs.writeFileSync(path.join(root, rel), text, "utf8");
}
function mustReplace(rel, from, to, label) {
  const src = read(rel);
  if (!src.includes(from)) {
    throw new Error(`MISSING in ${rel}: ${label}\n---\n${from.slice(0, 200)}`);
  }
  if (src.indexOf(from) !== src.lastIndexOf(from)) {
    console.warn(`WARN multiple matches in ${rel}: ${label}`);
  }
  write(rel, src.replace(from, to));
  console.log("OK", rel, label);
}

// --- botScript.ts ---
mustReplace(
  "web/src/bots/botScript.ts",
  `  | "fleet-warp-to-broadcast"
  // ─── Exploration: a safe probe sweep driven by EveJS's current authority.
  | "launch-scan-probes"`,
  `  | "fleet-warp-to-broadcast"
  // ─── Fleet mining boss modules (Orca / Rorqual command bursts + industrial core).
  | "command-bursts-on"
  | "command-bursts-off"
  | "industrial-core-on"
  | "industrial-core-off"
  // ─── Exploration: a safe probe sweep driven by EveJS's current authority.
  | "launch-scan-probes"`,
  "MacroID union",
);

mustReplace(
  "web/src/bots/botScript.ts",
  `  "fleet-warp-to-broadcast",
  "launch-scan-probes",
  "analyze-signatures",
  "recover-scan-probes"
]);`,
  `  "fleet-warp-to-broadcast",
  "command-bursts-on",
  "command-bursts-off",
  "industrial-core-on",
  "industrial-core-off",
  "launch-scan-probes",
  "analyze-signatures",
  "recover-scan-probes"
]);`,
  "MACRO_IDS array",
);

// --- macroSpecs.ts ---
mustReplace(
  "web/src/bots/macroSpecs.ts",
  `  "fleet-warp-to-broadcast": { args: [], untilRequired: false },
  "launch-scan-probes": { args: [], untilRequired: false },`,
  `  "fleet-warp-to-broadcast": { args: [], untilRequired: false },
  // Orca/Rorqual boss: Command Burst group (incl. Mining Foreman) + Industrial Core type names.
  "command-bursts-on": { args: [], untilRequired: false },
  "command-bursts-off": { args: [], untilRequired: false },
  "industrial-core-on": { args: [], untilRequired: false },
  "industrial-core-off": { args: [], untilRequired: false },
  "launch-scan-probes": { args: [], untilRequired: false },`,
  "MACRO_SPECS",
);

// --- runPolicy.ts ---
mustReplace(
  "web/src/bots/runPolicy.ts",
  `  "fleet-warp-to-broadcast": policy(["fleet"]),
  // Launch/recover move probe charges between ship and space. Analyze itself is`,
  `  "fleet-warp-to-broadcast": policy(["fleet"]),
  "command-bursts-on": policy(["fleet"]),
  "command-bursts-off": policy(["fleet"]),
  "industrial-core-on": policy(["fleet"]),
  "industrial-core-off": policy(["fleet"]),
  // Launch/recover move probe charges between ship and space. Analyze itself is`,
  "MACRO_RUN_POLICY",
);

// --- scriptText.ts names ---
mustReplace(
  "web/src/bots/scriptText.ts",
  `    case "fleet-warp-to-broadcast":
      return "Warp to fleet broadcast";
    case "launch-scan-probes":
      return "Launch scan probes";`,
  `    case "fleet-warp-to-broadcast":
      return "Warp to fleet broadcast";
    case "command-bursts-on":
      return "Command bursts on";
    case "command-bursts-off":
      return "Command bursts off";
    case "industrial-core-on":
      return "Industrial core on";
    case "industrial-core-off":
      return "Industrial core off";
    case "launch-scan-probes":
      return "Launch scan probes";`,
  "macroName",
);

console.log("part1 done");
