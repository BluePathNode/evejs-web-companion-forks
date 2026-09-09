const fs = require("fs");
const t = fs.readFileSync("web/src/store/types.ts","utf8");
const i = t.indexOf("export interface SpaceEntity");
const j = t.indexOf("export interface", i+10);
console.log(t.slice(i, j));
