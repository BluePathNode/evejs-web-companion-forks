const fs = require("fs");
const path = "C:/Users/Astap/Documents/Eve-Dev/evejs-web-companion-fork/web/src/nav/standingFleetBoss.macro.test.ts";
let t = fs.readFileSync(path, "utf8");
t = t.replaceAll(" as ScriptObservation,", " as unknown as ScriptObservation,");
fs.writeFileSync(path, t);
console.log("fixed", (t.match(/as unknown as ScriptObservation/g) || []).length);
