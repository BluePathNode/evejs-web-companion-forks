from pathlib import Path
ROOT = Path(r'C:/Users/Astap/Documents/Eve-Dev/evejs-web-companion-fork')
checks = [
    ('scriptMacros impl', 'web/src/nav/scriptMacros.ts', 'fleetWarpToBroadcast'),
    ('scriptMacros reg', 'web/src/nav/scriptMacros.ts', 'fleet-warp-to-broadcast": fleetWarpToBroadcast'),
    ('scriptConditions', 'web/src/nav/scriptConditions.ts', 'lastFleetBroadcast'),
    ('botScript', 'web/src/bots/botScript.ts', 'fleet-warp-to-broadcast'),
    ('macroSpecs', 'web/src/bots/macroSpecs.ts', 'fleet-warp-to-broadcast'),
    ('runPolicy', 'web/src/bots/runPolicy.ts', 'fleet-warp-to-broadcast'),
    ('scriptText', 'web/src/bots/scriptText.ts', 'fleet-warp-to-broadcast'),
    ('catalog', 'web/src/bots/macroCatalogView.ts', 'fleet-warp-to-broadcast'),
    ('flow', 'web/src/app/flow.ts', 'loadLastFleetBroadcast'),
    ('api', 'web/src/app/api.ts', 'loadLastFleetBroadcast'),
    ('server', 'src/server.js', '/api/bridge/fleet/last-broadcast'),
]
for name, rel, needle in checks:
    t = (ROOT / rel).read_text(encoding='utf-8')
    print(('OK' if needle in t else 'MISSING'), name)
