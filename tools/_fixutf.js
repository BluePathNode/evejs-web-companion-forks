const fs = require("fs");
const files = [
  "web/src/nav/scriptDecide.ts",
  "web/src/bots/macroSpecs.ts",
  "web/src/bots/runPolicy.ts",
  "web/src/bots/macroCatalogView.ts",
];

function isCont(b) { return b >= 0x80 && b <= 0xbf; }

function findBad(buf) {
  const bad = [];
  for (let i = 0; i < buf.length; i++) {
    const c = buf[i];
    if (c <= 0x7f) continue;
    if (c >= 0xc2 && c <= 0xdf) {
      if (i+1 >= buf.length || !isCont(buf[i+1])) bad.push(i);
      else i++;
      continue;
    }
    if (c >= 0xe0 && c <= 0xef) {
      if (i+2 >= buf.length || !isCont(buf[i+1]) || !isCont(buf[i+2])) bad.push(i);
      else i+=2;
      continue;
    }
    if (c >= 0xf0 && c <= 0xf4) {
      if (i+3 >= buf.length || !isCont(buf[i+1]) || !isCont(buf[i+2]) || !isCont(buf[i+3])) bad.push(i);
      else i+=3;
      continue;
    }
    bad.push(i);
  }
  return bad;
}

for (const f of files) {
  const buf = Buffer.from(fs.readFileSync(f));
  const bad = findBad(buf);
  console.log(f, "bad at", bad);
  for (const i of bad) {
    const start = Math.max(0, i-20);
    const end = Math.min(buf.length, i+20);
    console.log("  context", JSON.stringify(buf.slice(start, end).toString("latin1")));
    console.log("  bytes", [...buf.slice(i, i+4)].map(b=>b.toString(16)));
  }
  // Fix: replace lone invalid bytes with ASCII equivalents commonly intended
  // Common Windows-1252: 0x97 = em dash, 0x93/0x94 = smart quotes, 0xA0 = nbsp, 0x85 = ellipsis
  let out = Buffer.from(buf);
  const map = {
    0x85: "...",
    0x91: "'",
    0x92: "'",
    0x93: '"',
    0x94: '"',
    0x96: "-",
    0x97: "-",
    0xa0: " ",
  };
  // Rebuild by walking and replacing bad single bytes
  const parts = [];
  let last = 0;
  for (const i of bad) {
    parts.push(out.slice(last, i));
    const b = out[i];
    const repl = map[b] || "?";
    parts.push(Buffer.from(repl, "utf8"));
    last = i + 1;
  }
  parts.push(out.slice(last));
  const fixed = Buffer.concat(parts);
  const still = findBad(fixed);
  if (still.length) {
    console.error("still bad", f, still);
    process.exit(1);
  }
  fs.writeFileSync(f, fixed);
  console.log("fixed", f);
}
