# -*- coding: utf-8 -*-
from pathlib import Path
import re

ROOT = Path(r"C:\Users\Astap\Documents\Eve-Dev\evejs-web-companion-fork")

def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")

def write(rel, text):
    (ROOT / rel).write_text(text, encoding="utf-8", newline="\n")
    print("wrote", rel)

st = read("web/src/bots/scriptText.ts")
if 'case "fleet-warp-to-broadcast":\n      return "Warp to fleet broadcast"' not in st:
    st = st.replace(
        'case "fleet-warp-to-me":\n      return "Broadcast fleet warp to me";',
        'case "fleet-warp-to-me":\n      return "Broadcast fleet warp to me";\n    case "fleet-warp-to-broadcast":\n      return "Warp to fleet broadcast";',
        1,
    )
m = re.search(r'case "fleet-warp-to-me": \{.*?\n    \}', st, re.S)
if not m:
    raise SystemExit("no long fleet-warp-to-me")
long_insert = (
    '\n    case "fleet-warp-to-broadcast":\n'
    '      return "Wait for the last fleet location broadcast (boss warp-to-me ping), warp to that ship, done on arrival";'
)
if 'case "fleet-warp-to-broadcast":\n      return "Wait for the last' not in st:
    st = st[: m.end()] + long_insert + st[m.end() :]
write("web/src/bots/scriptText.ts", st)

cv = read("web/src/bots/macroCatalogView.ts")
if '"fleet-warp-to-broadcast"' not in cv:
    m = re.search(
        r'"fleet-warp-to-me": entry\(\s*"fleet-warp-to-me",\s*"fleet",\s*"[^"]*",\s*"[^"]*",\s*\),',
        cv,
        re.S,
    )
    if not m:
        raise SystemExit("no catalog fleet-warp-to-me")
    insert = (
        '\n  "fleet-warp-to-broadcast": entry(\n'
        '    "fleet-warp-to-broadcast",\n'
        '    "fleet",\n'
        '    "Miner pair for Broadcast fleet warp to me: waits for the last fleet location broadcast this companion saw from your fleet (InPosition ping), warps to that ship/item, and finishes on arrival. EveJS has no GetBroadcast / WarpToMember — the fork remembers the boss SendBroadcast so miners can warp via CmdWarpToStuff.",\n'
        '    "Being in a fleet, in space; a recent boss fleet-warp-to-me broadcast on this companion",\n'
        "  ),"
    )
    cv = cv[: m.end()] + insert + cv[m.end() :]
    write("web/src/bots/macroCatalogView.ts", cv)
else:
    print("catalog ok")

sc = read("web/src/nav/scriptConditions.ts")
if "lastFleetBroadcast" not in sc:
    needle = "readonly fleetMemberCharacterIDs?: readonly number[] | null;"
    i = sc.find(needle)
    if i < 0:
        raise SystemExit("no fleetMemberCharacterIDs")
    insert = (
        "\n  /**\n"
        "   * Last fleet location broadcast remembered by this companion for the session fleet\n"
        "   * (fork cache filled when any member runs SendBroadcast / fleet-warp-to-me).\n"
        "   * null = unreadable / none yet. EveJS has no GetBroadcast read.\n"
        "   */\n"
        "  readonly lastFleetBroadcast?: {\n"
        "    readonly itemID: number;\n"
        "    readonly typeID: number | null;\n"
        "    readonly name: string;\n"
        "    readonly scope: string | null;\n"
        "    readonly atMs: number;\n"
        "    readonly fleetID: number;\n"
        "  } | null;"
    )
    sc = sc[: i + len(needle)] + insert + sc[i + len(needle) :]
    write("web/src/nav/scriptConditions.ts", sc)
else:
    print("conditions ok")
print("OK rest catalog")
