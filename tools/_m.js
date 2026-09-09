const fs = require("fs");
const src = fs.readFileSync("web/src/bots/botScript.ts", "utf8");
const start = src.indexOf("export const MACRO_IDS");
console.log("start", start);
console.log(src.slice(start, start+2500));
