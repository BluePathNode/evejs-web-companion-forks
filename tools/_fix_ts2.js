const fs = require("fs");

{
  const path = "C:/Users/Astap/Documents/Eve-Dev/evejs-web-companion-fork/web/src/nav/scriptMacros.ts";
  let t = fs.readFileSync(path, "utf8");
  t = t.replace(
    "advertData: advertData as Readonly<Record<string, unknown>>",
    "advertData: advertData as unknown as Readonly<Record<string, unknown>>"
  );
  fs.writeFileSync(path, t);
  console.log("cast via unknown");
}

{
  const path = "C:/Users/Astap/Documents/Eve-Dev/evejs-web-companion-fork/web/src/nav/standingFleetBoss.macro.test.ts";
  let t = fs.readFileSync(path, "utf8");
  if (!t.includes("as ScriptObservation")) {
    t = t.replace(
      'import { SCRIPT_MACROS } from "./scriptMacros.ts";',
      'import { SCRIPT_MACROS } from "./scriptMacros.ts";\nimport type { ScriptObservation } from "./scriptConditions.ts";'
    );
    t = t.replaceAll("{ inFleet: false },", "{ inFleet: false } as ScriptObservation,");
    t = t.replace(
      "{ inFleet: true, fleetAdvertLive: false, fleetAdvert: null, fleetJoinRequests: [] },",
      "{ inFleet: true, fleetAdvertLive: false, fleetAdvert: null, fleetJoinRequests: [] } as ScriptObservation,"
    );
    fs.writeFileSync(path, t);
  }
  console.log("tests cast obs");
}
