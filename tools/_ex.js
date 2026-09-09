const fs = require("fs");
// Compare interrupt ids used as fixed strings across examples that might collide when flattened
const ex = fs.readFileSync("web/src/bots/exampleBots.ts", "utf8");
// Find all id: "..." in example docs
const allIds = [...ex.matchAll(/id:\s*"([^"]+)"/g)].map(m => m[1]);
console.log("all example string ids count", allIds.length);
// Within each const DOC = 
const parts = ex.split(/const\s+([A-Z_]+)\s*[:=]/);
for (let i = 1; i < parts.length; i += 2) {
  const name = parts[i];
  const body = parts[i+1] || "";
  const ids = [...body.matchAll(/id:\s*"([^"]+)"/g)].map(m => m[1]);
  const seen = new Map();
  for (const id of ids) seen.set(id, (seen.get(id)||0)+1);
  const dups = [...seen].filter(([,n]) => n>1);
  if (dups.length) console.log("DUP", name, dups);
}
console.log("done");
