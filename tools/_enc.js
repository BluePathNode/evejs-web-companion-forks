const fs = require("fs");
const files = [
  "web/src/nav/scriptDecide.ts",
  "web/src/bots/macroSpecs.ts",
  "web/src/bots/runPolicy.ts",
  "web/src/bots/macroCatalogView.ts",
  "web/src/bots/scriptEdit.ts",
  "web/src/ui/BotBuilder.svelte",
  "web/src/ui/StationPicker.svelte",
  "web/src/ui/MiningBot.svelte",
];
for (const f of files) {
  const buf = fs.readFileSync(f);
  const bom = buf[0]===0xEF && buf[1]===0xBB && buf[2]===0xBF;
  let bad = 0;
  try { buf.toString("utf8"); } catch {}
  // find invalid utf8 sequences
  for (let i = 0; i < buf.length; i++) {
    const c = buf[i];
    if (c <= 0x7f) continue;
    if (c >= 0xc2 && c <= 0xdf) {
      if (i+1 >= buf.length || buf[i+1] < 0x80 || buf[i+1] > 0xbf) { bad++; i++; continue; }
      i++; continue;
    }
    if (c >= 0xe0 && c <= 0xef) {
      if (i+2 >= buf.length || buf[i+1] < 0x80 || buf[i+1] > 0xbf || buf[i+2] < 0x80 || buf[i+2] > 0xbf) { bad++; i+=2; continue; }
      i+=2; continue;
    }
    if (c >= 0xf0 && c <= 0xf4) {
      if (i+3 >= buf.length) { bad++; i+=3; continue; }
      i+=3; continue;
    }
    bad++;
  }
  console.log(f, "len", buf.length, "bom", bom, "badBytes", bad, "nul", buf.includes(0));
}
