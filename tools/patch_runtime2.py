# -*- coding: utf-8 -*-
from pathlib import Path
import re

ROOT = Path(r"C:\Users\Astap\Documents\Eve-Dev\evejs-web-companion-fork")
SNIP = ROOT / "tools" / "fleetWarpToBroadcast.snippet.ts"

def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")

def write(rel, text):
    (ROOT / rel).write_text(text, encoding="utf-8", newline="\n")
    print("wrote", rel)

sm = read("web/src/nav/scriptMacros.ts")
if "fleetWarpToBroadcast" not in sm:
    snippet = SNIP.read_text(encoding="utf-8")
    if "measureSpace(" not in sm:
        raise SystemExit("measureSpace not used in scriptMacros")
    anchor = "export const SCRIPT_MACROS: CompleteMacroRegistry = {"
    i = sm.find(anchor)
    if i < 0:
        raise SystemExit("no SCRIPT_MACROS")
    sm = sm[:i] + snippet + "\n" + sm[i:]
    old = '"fleet-warp-to-me": fleetWarpToMe,'
    new = '"fleet-warp-to-me": fleetWarpToMe,\n  "fleet-warp-to-broadcast": fleetWarpToBroadcast,'
    if old not in sm:
        raise SystemExit("registry anchor missing")
    sm = sm.replace(old, new, 1)
    write("web/src/nav/scriptMacros.ts", sm)
else:
    print("scriptMacros already")

sm = read("web/src/nav/scriptMacros.ts")
for i, line in enumerate(sm.splitlines()[:120], 1):
    if "measureSpace" in line:
        print(i, line.strip()[:160])
for i, line in enumerate(sm.splitlines(), 1):
    if re.search(r"function measureSpace|const measureSpace|import .*measureSpace", line):
        print("DEF/IMPORT", i, line.strip()[:160])
print("done")
