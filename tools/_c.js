const fs = require("fs");
const cat = fs.readFileSync("web/src/bots/macroCatalogView.ts","utf8");
// Find ENTRIES object keys - lines like `  "undock": {` or `  undock: {`
const keys = [...cat.matchAll(/^\s+(?:"([^"]+)"|([a-z0-9-]+)):\s*\{/gm)].map(m => m[1]||m[2]);
console.log("entry-like keys", keys.length);
const seen = new Map();
for (const k of keys) seen.set(k, (seen.get(k)||0)+1);
console.log("dups", [...seen].filter(([,n])=>n>1));

// Also check Type MacroID union vs ENTRIES
const bot = fs.readFileSync("web/src/bots/botScript.ts","utf8");
const union = bot.match(/export type MacroID\s*=([\s\S]*?);/);
if (union) {
  const ids = [...union[1].matchAll(/"([^"]+)"/g)].map(m=>m[1]);
  const s = new Map();
  for (const id of ids) s.set(id,(s.get(id)||0)+1);
  console.log("MacroID union", ids.length, "dups", [...s].filter(([,n])=>n>1));
}
