const fs = require("fs");
const path = require("path");
function walk(d, acc=[]) {
  for (const e of fs.readdirSync(d, {withFileTypes:true})) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith(".ts")) acc.push(p);
  }
  return acc;
}
for (const f of walk("web/src")) {
  const t = fs.readFileSync(f, "utf8");
  if (t.includes("kind: \"structure\"") && t.includes("itemID:") && t.includes("space/snapshot")) {
    console.log(f);
  }
}
