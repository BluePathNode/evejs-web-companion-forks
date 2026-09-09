const fs = require("fs");
const data = JSON.parse(fs.readFileSync("data/bot-scripts.json","utf8"));
const scripts = data.scripts || data;
const list = Array.isArray(scripts) ? scripts : Object.values(scripts);
console.log("scripts", list.length);
function walkIds(doc) {
  const ids = [];
  for (const row of (doc.interrupts||[])) ids.push({where:"interrupt", id:row.id});
  const walk = (n, where) => {
    ids.push({where, id:n.id, kind:n.kind});
    if (n.kind === "loop") (n.body||[]).forEach((e,i)=>walk(e, where+`.body[${i}]`));
    if (n.kind === "branch") {
      (n.then||[]).forEach((e,i)=>walk(e, where+`.then[${i}]`));
      (n.else||[]).forEach((e,i)=>walk(e, where+`.else[${i}]`));
    }
  };
  (doc.program||[]).forEach((n,i)=>walk(n, `program[${i}]`));
  return ids;
}
for (const rec of list) {
  const doc = rec.doc || rec;
  const name = doc.name || rec.name || rec.scriptID;
  const ids = walkIds(doc);
  const seen = new Map();
  const dups = [];
  for (const row of ids) {
    if (seen.has(row.id)) dups.push({id:row.id, first:seen.get(row.id), again:row.where});
    else seen.set(row.id, row.where);
  }
  // Simulate editor steps list keys
  const program = doc.program||[];
  const first = program[0];
  let steps;
  if (program.length === 1 && first && first.kind === "loop") steps = [...first.body];
  else if (program.every(n => n.kind !== "loop")) steps = program.filter(n => n.kind !== "loop");
  else steps = program.flatMap(n => n.kind === "macro" ? [n] : n.kind === "loop" ? [...n.body] : [...(n.then||[]), ...(n.else||[])]);
  const stepIds = steps.map(s => s.id);
  const stepSeen = new Map();
  const stepDups = [];
  stepIds.forEach((id,i) => {
    if (stepSeen.has(id)) stepDups.push({id, i, prev: stepSeen.get(id)});
    else stepSeen.set(id, i);
  });
  // branch side dups
  const sideDups = [];
  for (const s of steps) {
    if (s.kind !== "branch") continue;
    for (const side of ["then","else"]) {
      const list = s[side]||[];
      const m = new Map();
      list.forEach((x,j) => {
        if (m.has(x.id)) sideDups.push({branch:s.id, side, id:x.id});
        else m.set(x.id,j);
      });
    }
  }
  console.log("---", name, "scriptID", rec.scriptID);
  console.log("  total ids", ids.length, "unique", seen.size, "dups", dups);
  console.log("  editor steps", stepIds.length, "stepDups", stepDups, "sideDups", sideDups);
  const watchIds = (doc.interrupts||[]).map(r=>r.id);
  const wSeen = new Map();
  const wDups = [];
  watchIds.forEach(id => { if (wSeen.has(id)) wDups.push(id); else wSeen.set(id,1); });
  console.log("  watchDups", wDups);
}
