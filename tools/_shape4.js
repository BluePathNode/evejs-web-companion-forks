const fs = require("fs");
const t = fs.readFileSync("web/src/store/types.ts","utf8");
const i = t.indexOf("export interface SpaceEntity");
console.log(t.slice(i, i+2200));
const cs = fs.readFileSync("web/src/store/clientStore.ts","utf8");
const k = cs.indexOf('case "flight/location"');
console.log("---loc---");
console.log(cs.slice(k, k+1200));
