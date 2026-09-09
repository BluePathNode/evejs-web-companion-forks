# -*- coding: utf-8 -*-
from pathlib import Path
import re

ROOT = Path(r"C:\Users\Astap\Documents\Eve-Dev\evejs-web-companion-fork")

def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")

def write(rel, text):
    (ROOT / rel).write_text(text, encoding="utf-8", newline="\n")
    print("wrote", rel)

def sub_once(text, pattern, repl, label, flags=0):
    new, n = re.subn(pattern, repl, text, count=1, flags=flags)
    if n != 1:
        raise SystemExit(f"FAIL {label}: matched {n}")
    return new

def insert_after(text, anchor_re, insert, label, flags=0):
    m = re.search(anchor_re, text, flags)
    if not m:
        raise SystemExit(f"FAIL find {label}")
    if insert.strip() in text:
        print(f"skip already present: {label}")
        return text
    return text[: m.end()] + insert + text[m.end() :]

# ── botScript.ts ──
bs = read("web/src/bots/botScript.ts")
bs = insert_after(
    bs,
    r'\| "fleet-warp-to-me"',
    '\n  | "fleet-warp-to-broadcast"',
    "botScript type",
)
bs = insert_after(
    bs,
    r'"fleet-warp-to-me",',
    '\n  "fleet-warp-to-broadcast",',
    "botScript MACRO_IDS",
)
write("web/src/bots/botScript.ts", bs)

# ── macroSpecs.ts ──
ms = read("web/src/bots/macroSpecs.ts")
ms = insert_after(
    ms,
    r'"fleet-warp-to-me": \{\s*args: \[\{ key: "greaterThan", kind: "count", required: false \}\],\s*untilRequired: false,\s*\},',
    '\n  // Miner: wait for last fleet location broadcast (boss fleet-warp-to-me), warp to it.\n  "fleet-warp-to-broadcast": { args: [], untilRequired: false },',
    "macroSpecs",
    flags=re.S,
)
write("web/src/bots/macroSpecs.ts", ms)

# ── runPolicy.ts ──
rp = read("web/src/bots/runPolicy.ts")
rp = insert_after(
    rp,
    r'"fleet-warp-to-me": policy\(\["fleet"\]\),',
    '\n  "fleet-warp-to-broadcast": policy(["fleet"]),',
    "runPolicy",
)
write("web/src/bots/runPolicy.ts", rp)

# ── scriptText.ts ──
st = read("web/src/bots/scriptText.ts")
st = insert_after(
    st,
    r'case "fleet-warp-to-me":\s*return "Broadcast fleet warp to me";',
    '\n    case "fleet-warp-to-broadcast":\n      return "Warp to fleet broadcast";',
    "scriptText short",
    flags=re.S,
)
st = insert_after(
    st,
    r'case "fleet-warp-to-me": \{.*?location ping[^\n]*forced fleet warp[^\n]*\);\s*\}',
    '\n    case "fleet-warp-to-broadcast":\n      return "Wait for the last fleet location broadcast (boss warp-to-me ping), warp to that ship, done on arrival";',
    "scriptText long",
    flags=re.S,
)
write("web/src/bots/scriptText.ts", st)

# ── macroCatalogView.ts ──
cv = read("web/src/bots/macroCatalogView.ts")
cv = insert_after(
    cv,
    r'"fleet-warp-to-me": entry\(\s*"fleet-warp-to-me",\s*"fleet",\s*"[^"]*",\s*"[^"]*",\s*\),',
    '''
  "fleet-warp-to-broadcast": entry(
    "fleet-warp-to-broadcast",
    "fleet",
    "Miner pair for Broadcast fleet warp to me: waits for the last fleet location broadcast this companion saw from your fleet (InPosition ping), warps to that ship/item, and finishes on arrival. EveJS has no GetBroadcast / WarpToMember — the fork remembers the boss SendBroadcast so miners can warp via CmdWarpToStuff.",
    "Being in a fleet, in space; a recent boss fleet-warp-to-me broadcast on this companion",
  ),''',
    "catalog",
    flags=re.S,
)
write("web/src/bots/macroCatalogView.ts", cv)

# ── scriptConditions.ts ──
sc = read("web/src/nav/scriptConditions.ts")
sc = insert_after(
    sc,
    r'readonly fleetMemberCharacterIDs\?: readonly number\[\] \| null;',
    '''
  /**
   * Last fleet location broadcast remembered by this companion for the session fleet
   * (fork cache filled when any member runs SendBroadcast / fleet-warp-to-me).
   * null = unreadable / none yet. EveJS has no GetBroadcast read.
   */
  readonly lastFleetBroadcast?: {
    readonly itemID: number;
    readonly typeID: number | null;
    readonly name: string;
    readonly scope: string | null;
    readonly atMs: number;
    readonly fleetID: number;
  } | null;''',
    "scriptConditions",
)
write("web/src/nav/scriptConditions.ts", sc)

print("OK phase catalog+obs")
