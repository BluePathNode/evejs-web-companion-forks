const fs = require("fs");
function dups(ids) {
  const seen = new Map();
  for (const id of ids) seen.set(id, (seen.get(id) || 0) + 1);
  return [...seen].filter(([, n]) => n > 1);
}
const cat = fs.readFileSync("web/src/bots/macroCatalogView.ts", "utf8");
const catIds = [...cat.matchAll(/\bid:\s*["']([^"']+)["']/g)].map((m) => m[1]);
console.log("macroCatalogView ids", catIds.length, "dups", dups(catIds));

const ex = fs.readFileSync("web/src/bots/exampleBots.ts", "utf8");
console.log("example keys dups", dups([...ex.matchAll(/\bkey:\s*["']([^"']+)["']/g)].map((m) => m[1])));

const sn = fs.readFileSync("web/src/bots/blockSnippets.ts", "utf8");
console.log("snippet ids dups", dups([...sn.matchAll(/\bid:\s*["']([^"']+)["']/g)].map((m) => m[1])));

// program step ids per example doc
const docs = [...ex.matchAll(/const\s+(\w+)\s*[:=][\s\S]*?interrupts:\s*\[([\s\S]*?)\][\s\S]*?program:\s*\[([\s\S]*?)\]\s*,?\s*\}/g)];
console.log("docs matched", docs.length);
for (const m of docs) {
  const name = m[1];
  const ints = [...m[2].matchAll(/id:\s*["']([^"']+)["']/g)].map((x) => x[1]);
  const steps = [...m[3].matchAll(/id:\s*["']([^"']+)["']/g)].map((x) => x[1]);
  const all = [...ints, ...steps];
  const d = dups(all);
  if (d.length) console.log("DUP in", name, d, { ints, steps });
}
