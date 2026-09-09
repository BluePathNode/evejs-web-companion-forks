# -*- coding: utf-8 -*-
"""Add fleet-warp-to-broadcast macro + fork last-broadcast cache."""
from pathlib import Path
import re

ROOT = Path(r"C:\Users\Astap\Documents\Eve-Dev\evejs-web-companion-fork")

def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")

def write(rel, text):
    p = ROOT / rel
    p.write_text(text, encoding="utf-8", newline="\n")
    print(f"wrote {rel} ({len(text)} bytes)")

def must_replace(text, old, new, label):
    if old not in text:
        raise SystemExit(f"MISSING in {label}: {old[:120]!r}")
    return text.replace(old, new, 1)

# ── botScript.ts ────────────────────────────────────────────────────────────
bs = read("web/src/bots/botScript.ts")
bs = must_replace(
    bs,
    '| "empty-belt-home-tether-wait"\n| "fleet-warp-to-me"',
    '| "empty-belt-home-tether-wait"\n| "fleet-warp-to-me"\n| "fleet-warp-to-broadcast"',
    "botScript type",
)
bs = must_replace(
    bs,
    '"empty-belt-home-tether-wait",\n  "fleet-warp-to-me",',
    '"empty-belt-home-tether-wait",\n  "fleet-warp-to-me",\n  "fleet-warp-to-broadcast",',
    "botScript MACRO_IDS",
)
write("web/src/bots/botScript.ts", bs)

# ── macroSpecs.ts ───────────────────────────────────────────────────────────
ms = read("web/src/bots/macroSpecs.ts")
ms = must_replace(
    ms,
    '''  "fleet-warp-to-me": {
    args: [{ key: "greaterThan", kind: "count", required: false }],
    untilRequired: false,
  },''',
    '''  "fleet-warp-to-me": {
    args: [{ key: "greaterThan", kind: "count", required: false }],
    untilRequired: false,
  },
  // Miner: wait for last fleet location broadcast (boss fleet-warp-to-me), warp to it.
  "fleet-warp-to-broadcast": { args: [], untilRequired: false },''',
    "macroSpecs",
)
write("web/src/bots/macroSpecs.ts", ms)

# ── runPolicy.ts ────────────────────────────────────────────────────────────
rp = read("web/src/bots/runPolicy.ts")
rp = must_replace(
    rp,
    '"fleet-warp-to-me": policy(["fleet"]),',
    '"fleet-warp-to-me": policy(["fleet"]),\n  "fleet-warp-to-broadcast": policy(["fleet"]),',
    "runPolicy",
)
write("web/src/bots/runPolicy.ts", rp)

# ── scriptText.ts ───────────────────────────────────────────────────────────
st = read("web/src/bots/scriptText.ts")
st = must_replace(
    st,
    '''    case "fleet-warp-to-me":
      return "Broadcast fleet warp to me";''',
    '''    case "fleet-warp-to-me":
      return "Broadcast fleet warp to me";
    case "fleet-warp-to-broadcast":
      return "Warp to fleet broadcast";''',
    "scriptText short",
)
# long sentence — find the fleet-warp-to-me case block and append after it
old_long = '''    case "fleet-warp-to-me": {
      const gate = step.args["greaterThan"];
      const n = gate !== undefined && gate.kind === "count" ? gate.value : null;
      if (n === null) {
        return "Broadcast your position to the fleet so members can warp to you (location ping — not a forced fleet warp)";
      }
      return (
        `When asteroid count is greater than ${n}, broadcast your position to the fleet so members can warp to you` +
        " (location ping — not a forced fleet warp)"
      );
    }'''
# encoding may use special dash — try flexible match
if old_long not in st:
    # try with ASCII hyphen variants / en-dash
    m = re.search(
        r'case "fleet-warp-to-me": \{.*?return \(\s*`When asteroid count.*?\);\s*\}',
        st,
        flags=re.S,
    )
    if not m:
        raise SystemExit("MISSING scriptText long fleet-warp-to-me block")
    old_long = m.group(0)
new_long = old_long + '''
    case "fleet-warp-to-broadcast":
      return "Wait for the last fleet location broadcast (boss warp-to-me ping), warp to that ship, done on arrival";'''
st = must_replace(st, old_long, new_long, "scriptText long")
write("web/src/bots/scriptText.ts", st)

# ── macroCatalogView.ts ─────────────────────────────────────────────────────
cv = read("web/src/bots/macroCatalogView.ts")
cv = must_replace(
    cv,
    '''  "fleet-warp-to-me": entry(
    "fleet-warp-to-me",
    "fleet",
    "After you are on grid (compose after wait-while-asteroids-above, or set the asteroid threshold here): sends a fleet location broadcast at your ship so fleet-mates can warp to you. EveJS cannot force a fleet warp yet - this is a broadcast ping, not a forced fleet warp.",
    "Being in a fleet, in space",
  ),''',
    '''  "fleet-warp-to-me": entry(
    "fleet-warp-to-me",
    "fleet",
    "After you are on grid (compose after wait-while-asteroids-above, or set the asteroid threshold here): sends a fleet location broadcast at your ship so fleet-mates can warp to you. EveJS cannot force a fleet warp yet - this is a broadcast ping, not a forced fleet warp.",
    "Being in a fleet, in space",
  ),
  "fleet-warp-to-broadcast": entry(
    "fleet-warp-to-broadcast",
    "fleet",
    "Miner pair for Broadcast fleet warp to me: waits for the last fleet location broadcast this companion saw from your fleet (InPosition ping), warps to that ship/item, and finishes on arrival. EveJS has no GetBroadcast / WarpToMember — the fork remembers the boss SendBroadcast so miners can warp via CmdWarpToStuff.",
    "Being in a fleet, in space; a recent boss fleet-warp-to-me broadcast on this companion",
  ),''',
    "macroCatalogView",
)
# If the dash character differs, try regex
if "fleet-warp-to-broadcast" not in cv:
    m = re.search(
        r'"fleet-warp-to-me": entry\(\s*"fleet-warp-to-me",\s*"fleet",\s*"[^"]*",\s*"[^"]*",\s*\),',
        cv,
        flags=re.S,
    )
    if not m:
        raise SystemExit("MISSING catalog fleet-warp-to-me entry")
    insert = m.group(0) + '''
  "fleet-warp-to-broadcast": entry(
    "fleet-warp-to-broadcast",
    "fleet",
    "Miner pair for Broadcast fleet warp to me: waits for the last fleet location broadcast this companion saw from your fleet (InPosition ping), warps to that ship/item, and finishes on arrival. EveJS has no GetBroadcast / WarpToMember — the fork remembers the boss SendBroadcast so miners can warp via CmdWarpToStuff.",
    "Being in a fleet, in space; a recent boss fleet-warp-to-me broadcast on this companion",
  ),'''
    cv = cv.replace(m.group(0), insert, 1)
    write("web/src/bots/macroCatalogView.ts", cv)
else:
    write("web/src/bots/macroCatalogView.ts", cv)

print("phase1 ok")
