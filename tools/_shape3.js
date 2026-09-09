const fs = require("fs");
const t = fs.readFileSync("web/src/store/types.ts","utf8");
const i = t.indexOf("export interface SpaceEntity");
console.log(t.slice(i, i+1200));
const j = t.indexOf("flight/location");
console.log("---");
// find ClientEvent union members for flight/location
const m = t.match(/type:\s*"flight\/location"[\s\S]*?\}/);
console.log(m ? m[0] : "not in types");
const cs = fs.readFileSync("web/src/store/clientStore.ts","utf8");
const k = cs.indexOf('case "flight/location"');
console.log(cs.slice(k, k+700));
