const { decodeScriptValue } = await import("./web/src/bots/scriptCodec.ts");
const { EXAMPLE_BOTS } = await import("./web/src/bots/exampleBots.ts");

function collectIds(doc) {
  const ids = [];
  for (const row of doc.interrupts) ids.push(["i", row.id]);
  const walk = (n, path) => {
    ids.push([path, n.id]);
    if (n.kind === "loop") n.body.forEach((e,i)=>walk(e, path+`.body[${i}]`));
    if (n.kind === "branch") {
      n.then.forEach((e,i)=>walk(e, path+`.then[${i}]`));
      n.else.forEach((e,i)=>walk(e, path+`.else[${i}]`));
    }
  };
  doc.program.forEach((n,i)=>walk(n, `p[${i}]`));
  return ids;
}

for (const ex of EXAMPLE_BOTS) {
  const result = decodeScriptValue(ex.doc);
  if (!result.ok) { console.log("FAIL", ex.key, result.refusal); continue; }
  const ids = collectIds(result.doc).map(x=>x[1]);
  const seen = new Map();
  for (const id of ids) seen.set(id,(seen.get(id)||0)+1);
  const dups = [...seen].filter(([,n])=>n>1);
  // Also simulate loadFrom flatten / body extract
  const doc = result.doc;
  const first = doc.program[0];
  let steps;
  if (doc.program.length === 1 && first?.kind === "loop") steps = [...first.body];
  else if (doc.program.every(n => n.kind !== "loop")) steps = doc.program.filter(n => n.kind !== "loop");
  else {
    steps = doc.program.flatMap(n => n.kind === "macro" ? [n] : n.kind === "loop" ? [...n.body] : [...n.then, ...n.else]);
  }
  const stepIds = steps.map(s => s.id);
  const stepSeen = new Map();
  for (const id of stepIds) stepSeen.set(id,(stepSeen.get(id)||0)+1);
  const stepDups = [...stepSeen].filter(([,n])=>n>1);
  if (dups.length || stepDups.length) console.log(ex.key, {dups, stepDups, stepIds});
  else console.log(ex.key, "ok", "steps", stepIds.length, "warnings", result.warnings);
}
