const fs = require("fs");
const f = fs.readFileSync("C:/Users/Astap/Documents/Eve-Dev/evejs-web-companion-fork/web/src/app/flow.ts", "utf8");
const i = f.indexOf("function resolveDefenseModuleIDs()");
console.log(f.slice(i, i + 550));
console.log("---RETURN---");
const i2 = f.indexOf("return { shield, armor, hull, hardeners, weapons, tackle, webs, tractors };");
console.log("return count", (f.match(/return \{ shield, armor, hull, hardeners, weapons, tackle, webs, tractors \};/g)||[]).length);