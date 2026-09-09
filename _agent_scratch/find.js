const fs = require("fs");
const s = fs.readFileSync("C:/Users/Astap/Documents/Eve-Dev/evejs-web-companion-fork/web/src/bots/scriptText.ts", "utf8");
let idx = 0, n = 0;
while ((idx = s.indexOf("fleet-warp-to-broadcast", idx)) >= 0) {
  console.log("occ", n++, idx, JSON.stringify(s.slice(idx - 10, idx + 200)));
  idx += 1;
}
const c = fs.readFileSync("C:/Users/Astap/Documents/Eve-Dev/evejs-web-companion-fork/web/src/bots/macroCatalogView.ts", "utf8");
idx = c.indexOf('"fleet-warp-to-broadcast"');
console.log("catalog", JSON.stringify(c.slice(idx, idx + 400)));
const cond = fs.readFileSync("C:/Users/Astap/Documents/Eve-Dev/evejs-web-companion-fork/web/src/nav/scriptConditions.ts", "utf8");
idx = cond.indexOf("tractorModuleIDs");
console.log("cond", JSON.stringify(cond.slice(idx, idx + 220)));