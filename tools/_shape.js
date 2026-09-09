const fs = require("fs");
const cs = fs.readFileSync("web/src/store/clientStore.ts","utf8");
for (const line of cs.split(/\n/)) {
  if (/case "station/.test(line) || /case "flight/.test(line)) console.log(line.trim());
}
const t = fs.readFileSync("web/src/store/types.ts","utf8");
const i = t.indexOf("export interface SpaceEntity");
console.log(t.slice(i, i+800));
