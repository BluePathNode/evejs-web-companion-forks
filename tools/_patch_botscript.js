const fs = require("fs");
const path = "C:/Users/Astap/Documents/Eve-Dev/evejs-web-companion-fork/web/src/bots/botScript.ts";
let t = fs.readFileSync(path, "utf8");
t = t.replace(
  /  \/\*\* Standing Fleet Boss accept rule \(corp \/ alliance \/ standings\)\. \*\/\r?\n\| \{ readonly kind: "fleetAcceptBy"; readonly acceptBy: FleetAcceptByArg \}\r?\n\/\*\* Standing threshold \(-10\.\.10\) for fleet-finder accept-by-standings\. \*\/\r?\n\| \{ readonly kind: "standing"; readonly value: number \}\r?\n\/\*\* A short line of text the player writes \(a chat message\)\. Never empty at run/,
  `  /** Standing Fleet Boss accept rule (corp / alliance / standings). */
  | { readonly kind: "fleetAcceptBy"; readonly acceptBy: FleetAcceptByArg }
  /** Standing threshold (-10..10) for fleet-finder accept-by-standings. */
  | { readonly kind: "standing"; readonly value: number }
  /** A short line of text the player writes (a chat message). Never empty at run`
);
if (!t.includes('"standing-fleet-boss"')) {
  t = t.replace('| "join-fleet"\n  //', '| "join-fleet"\n  | "standing-fleet-boss"\n  //');
  t = t.replace('| "join-fleet"\r\n  //', '| "join-fleet"\r\n  | "standing-fleet-boss"\r\n  //');
  t = t.replace('  "join-fleet",\n  "attack-player",', '  "join-fleet",\n  "standing-fleet-boss",\n  "attack-player",');
  t = t.replace('  "join-fleet",\r\n  "attack-player",', '  "join-fleet",\r\n  "standing-fleet-boss",\r\n  "attack-player",');
}
fs.writeFileSync(path, t);
console.log("macro", t.includes("standing-fleet-boss"));
console.log("fleetAcceptBy lines:");
for (const [i, line] of t.split(/\r?\n/).entries()) {
  if (line.includes("fleetAcceptBy") || line.includes("standing-fleet-boss") || line.includes('kind: "standing"')) {
    console.log(i + 1, line);
  }
}
