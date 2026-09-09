const fs = require("fs");
const path = require("path");

function isCont(b) { return b >= 0x80 && b <= 0xbf; }
function findBad(buf) {
  const bad = [];
  for (let i = 0; i < buf.length; i++) {
    const c = buf[i];
    if (c <= 0x7f) continue;
    if (c >= 0xc2 && c <= 0xdf) {
      if (i+1 >= buf.length || !isCont(buf[i+1])) bad.push(i); else i++;
      continue;
    }
    if (c >= 0xe0 && c <= 0xef) {
      if (i+2 >= buf.length || !isCont(buf[i+1]) || !isCont(buf[i+2])) bad.push(i); else i+=2;
      continue;
    }
    if (c >= 0xf0 && c <= 0xf4) {
      if (i+3 >= buf.length || !isCont(buf[i+1]) || !isCont(buf[i+2]) || !isCont(buf[i+3])) bad.push(i); else i+=3;
      continue;
    }
    bad.push(i);
  }
  return bad;
}

const map = {
  0x85: "...", 0x91: "'", 0x92: "'", 0x93: '"', 0x94: '"', 0x96: "-", 0x97: "-", 0xa0: " ",
};

function walk(d, acc=[]) {
  for (const e of fs.readdirSync(d, {withFileTypes:true})) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(ts|js|svelte|css|md|json)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

let fixedCount = 0;
for (const f of walk("web/src")) {
  const buf = Buffer.from(fs.readFileSync(f));
  const bad = findBad(buf);
  if (!bad.length) continue;
  console.log("fixing", f, "bad", bad.length, "at", bad.slice(0,5));
  const parts = [];
  let last = 0;
  for (const i of bad) {
    parts.push(buf.slice(last, i));
    parts.push(Buffer.from(map[buf[i]] || "?", "utf8"));
    last = i + 1;
  }
  parts.push(buf.slice(last));
  const fixed = Buffer.concat(parts);
  if (findBad(fixed).length) {
    console.error("still bad after fix", f);
    process.exit(1);
  }
  fs.writeFileSync(f, fixed);
  fixedCount++;
}
console.log("fixed files", fixedCount);
