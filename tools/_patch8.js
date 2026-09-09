const fs = require("fs");
const path = "web/src/ui/miningBotPanel.test.ts";
let t = fs.readFileSync(path, "utf8");
const marker = "test(\"station picker survives Upwell id collisions";
const start = t.indexOf(marker);
if (start < 0) { console.error("missing"); process.exit(1); }
const before = t.slice(0, start);
const replacement = `test("station picker survives Upwell id collisions (no each_key_duplicate)", () => {
  // Reproduce the post-Upwell footgun: two station/structure rows that share an
  // itemID (plus a flight-status home with the same id). The stations {#each}
  // keys on choice.id — duplicates throw and blank the panel.
  const store = createClientStore();
  const structureID = 1030000000001;
  const entity = (name: string) => ({
    kind: "structure",
    itemID: structureID,
    typeID: 35832,
    groupID: 1404,
    categoryID: 65,
    name,
    ownerID: null,
    radius: 100000,
    position: { x: 0, y: 0, z: 12000 },
    velocity: { x: 0, y: 0, z: 0 },
    isSelf: false,
    shieldRatio: null,
    armorRatio: null,
    hullRatio: null,
    characterID: null,
    corporationID: null,
    allianceID: null,
    securityStatus: null,
    maxVelocity: null,
    mode: null,
    capacitorRatio: null,
    remainingQuantity: null,
    miningYieldTypeID: null,
    beltID: null,
    isNpc: false,
    npcEntityType: null,
    controllerID: null,
    droneActivity: null,
    targetEntityID: null,
  });
  store.apply({
    type: "space/snapshot",
    snapshot: {
      inSpace: true,
      solarSystemID: 30000142,
      shipID: 9001,
      sampledAtMs: Date.now(),
      entities: [entity("Perimeter - Keepstar"), entity("Perimeter - Keepstar (dup)")],
      ship: null,
    },
  });
  store.apply({
    type: "flight/status",
    status: {
      inSpace: false,
      docked: true,
      solarSystemID: 30000142,
      stationID: null,
      structureID,
      shipID: 9001,
      shipMode: null,
      shipSpeedFraction: null,
    },
  });
  store.apply({
    type: "flight/location",
    forSolarSystemID: 30000142,
    forStationID: null,
    forStructureID: structureID,
    solarSystemName: "Perimeter",
    stationName: null,
    structureName: "Perimeter - Keepstar",
  });

  assert.doesNotThrow(() => {
    render(MiningBot as never, { props: { store, flow: fakeFlow() } } as never);
  }, "duplicate station/structure ids must not throw each_key_duplicate");
});
`;
fs.writeFileSync(path, before.trimEnd() + "\n\n" + replacement + "\n");
console.log("fixed entity fields");
