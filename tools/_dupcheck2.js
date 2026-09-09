const fs = require("fs");
const src = fs.readFileSync("web/src/bots/botScript.ts", "utf8");
const m = src.match(/MACRO_IDS[\s\S]*?=\s*\[([\s\S]*?)\]\s*as\s*const/);
if (!m) { console.log("no MACRO_IDS"); process.exit(1); }
const ids = [...m[1].matchAll(/"([^"]+)"/g)].map(x => x[1]);
const seen = new Map();
for (const id of ids) seen.set(id, (seen.get(id)||0)+1);
const dups = [...seen].filter(([,n]) => n>1);
console.log("MACRO_IDS", ids.length, "unique", seen.size, "dups", dups);

const sn = fs.readFileSync("web/src/bots/blockSnippets.ts", "utf8");
const snIds = [...sn.matchAll(/id:\s*"([^"]+)"/g)].map(x => x[1]);
const snSeen = new Map();
for (const id of snIds) snSeen.set(id, (snSeen.get(id)||0)+1);
console.log("blockSnippet string ids", snIds, "dups", [...snSeen].filter(([,n])=>n>1));

// ENTRIES keys in macroCatalogView
const cat = fs.readFileSync("web/src/bots/macroCatalogView.ts", "utf8");
const entryKeys = [...cat.matchAll(/^\s{2}([a-z0-9-]+):\s*\{/gm)].map(x => x[1]);
const ek = new Map();
for (const id of entryKeys) ek.set(id, (ek.get(id)||0)+1);
console.log("ENTRIES keys", entryKeys.length, "dups", [...ek].filter(([,n])=>n>1));

// Compare MACRO_IDS vs ENTRIES
const missing = ids.filter(id => !ek.has(id));
const extra = entryKeys.filter(id => !seen.has(id));
console.log("missing entries", missing);
console.log("extra entries", extra);
