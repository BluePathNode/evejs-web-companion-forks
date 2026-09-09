const fs = require("fs");
const p = "web/src/ui/miningBotPanel.test.ts";
let s = fs.readFileSync(p, "utf8");
if (s.includes("each_key_duplicate")) {
  console.log("mining test already has each_key_duplicate coverage");
  process.exit(0);
}

const addition = `

test("station picker survives Upwell id collisions (no each_key_duplicate)", () => {
  // Reproduce the post-Upwell footgun: an on-grid structure, StationStatic home,
  // and flight-status home can all claim the SAME numeric id. The stations
  // {#each} keys on choice.id — duplicates throw and blank the panel.
  const store = createClientStore();
  const structureID = 1030000000001;
  store.apply({
    type: "space/snapshot",
    snapshot: {
      inSpace: true,
      solarSystemID: 30000142,
      shipID: 9001,
      sampledAtMs: Date.now(),
      entities: [
        {
          itemID: structureID,
          typeID: 35832,
          groupID: 1404,
          name: "Perimeter - Keepstar",
          kind: "structure",
          isSelf: false,
          isTargeted: false,
          isTargeting: false,
          isAggressive: false,
          isCloaked: false,
          distance: 12_000,
          velocity: 0,
          radius: 100_000,
          beltID: null,
          position: { x: 0, y: 0, z: 12_000 },
        },
        // Deliberate duplicate row (would normally be stripped by the bridge
        // decoder — keep it here so the panel's own dedupe is what saves us).
        {
          itemID: structureID,
          typeID: 35832,
          groupID: 1404,
          name: "Perimeter - Keepstar (dup)",
          kind: "structure",
          isSelf: false,
          isTargeted: false,
          isTargeting: false,
          isAggressive: false,
          isCloaked: false,
          distance: 12_000,
          velocity: 0,
          radius: 100_000,
          beltID: null,
          position: { x: 0, y: 0, z: 12_000 },
        },
      ],
      ship: null,
    },
  } as never);
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
  } as never);
  store.apply({
    type: "station/static",
    station: {
      stationID: structureID,
      stationName: "Perimeter - Keepstar",
      solarSystemID: 30000142,
      solarSystemName: "Perimeter",
      security: 0.9,
      corporationID: 1,
      corporationName: "Test",
      regionID: 1,
      regionName: "The Forge",
      constellationID: 1,
      constellationName: "Kimotoro",
      reprocessingEfficiency: 0.5,
      reprocessingStationsTake: 0.05,
      reprocessingHangarFlag: 4,
      officeRentalCost: 0,
      services: [],
    },
  } as never);

  assert.doesNotThrow(() => {
    render(MiningBot as never, { props: { store, flow: fakeFlow() } } as never);
  }, "duplicate station/structure ids must not throw each_key_duplicate");
});
`;

s = s.trimEnd() + "\n" + addition;
fs.writeFileSync(p, s);
console.log("appended miningBotPanel collision test");
