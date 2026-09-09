// Stationary gate + loot targeting helpers for industrial MTU support.

import test from "node:test";
import assert from "node:assert/strict";

import type { SpaceEntity, SpaceShipStatus, SpaceSnapshot, SpaceVector } from "../store/types.ts";
import type { ScriptObservation } from "./scriptConditions.ts";
import type { SpaceMeasurement } from "./autopilotLoop.ts";
import {
  INDUSTRIAL_LOOT_RANGE_M,
  GROUP_MOBILE_TRACTOR_UNIT,
  isIndustrialSupportShip,
  isMobileTractorUnitEntity,
  isMobileTractorUnitRow,
  jetcansWithinRange,
  mtusInCargo,
  mtusOnGrid,
  pickMtuOnGrid,
  stationaryForIndustrialSupport,
} from "./industrialMiningSupport.ts";

const ORIGIN: SpaceVector = { x: 0, y: 0, z: 0 };

function entity(over: Partial<SpaceEntity> & { itemID: number }): SpaceEntity {
  return {
    kind: "celestial",
    typeID: 1,
    groupID: 1,
    categoryID: 2,
    name: null,
    ownerID: null,
    radius: 10,
    position: ORIGIN,
    velocity: ORIGIN,
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
    ...over,
  };
}

function ship(over: Partial<SpaceShipStatus> = {}): SpaceShipStatus {
  return {
    itemID: 9001,
    typeID: 28606,
    name: "Orca",
    mode: "STOP",
    maxVelocity: 100,
    radius: 100,
    position: ORIGIN,
    velocity: ORIGIN,
    shieldRatio: 1,
    armorRatio: 1,
    hullRatio: 1,
    capacitorRatio: 1,
    shieldCapacity: null,
    armorCapacity: null,
    hullCapacity: null,
    activeModuleIDs: [],
    ...over,
  } as SpaceShipStatus;
}

function snapshot(entities: SpaceEntity[], shipOver: Partial<SpaceShipStatus> = {}): SpaceSnapshot {
  return {
    inSpace: true,
    solarSystemID: 30000142,
    shipID: 9001,
    sampledAtMs: 1,
    entities,
    ship: ship(shipOver),
  };
}

function obs(over: Partial<ScriptObservation> = {}): ScriptObservation {
  return {
    inSpace: true,
    docked: false,
    inWarp: false,
    shieldRatio: 1,
    armorRatio: 1,
    hullRatio: 1,
    health: 1,
    oreHoldFraction: 0,
    holdEmpty: true,
    hostileOnGrid: false,
    dronesOut: false,
    flightStatus: {
      inSpace: true,
      docked: false,
      solarSystemID: 30000142,
      stationID: null,
      structureID: null,
      shipID: 9001,
      shipMode: "STOP",
      shipSpeedFraction: 0,
    },
    snapshot: snapshot([]),
    lockedTargetIDs: [],
    holds: null,
    droneBayItemIDs: [],
    miningModuleIDs: [],
    startingStationID: null,
    ...over,
  };
}

test("industrial support ship gate: Orca / Porpoise / Rorqual only", () => {
  assert.equal(isIndustrialSupportShip(ship({ typeID: 28606, name: "Orca" })), true);
  assert.equal(isIndustrialSupportShip(ship({ typeID: 42244, name: "Porpoise" })), true);
  assert.equal(isIndustrialSupportShip(ship({ typeID: 28352, name: "Rorqual" })), true);
  assert.equal(isIndustrialSupportShip(ship({ typeID: 17476, name: "Procurer" })), false);
  assert.equal(isIndustrialSupportShip(ship({ typeID: 1, name: "My Rorqual" })), true);
});

test("stationary gate: warping / moving fail; STOP passes; unknown waits", () => {
  assert.equal(stationaryForIndustrialSupport(obs({ inWarp: true })).ok, false);
  assert.equal(
    stationaryForIndustrialSupport(
      obs({
        inWarp: false,
        snapshot: snapshot([], { mode: "WARP", velocity: ORIGIN }),
      }),
    ).ok,
    false,
  );
  assert.equal(
    stationaryForIndustrialSupport(
      obs({
        inWarp: false,
        snapshot: snapshot([], { mode: "FOLLOW", velocity: { x: 40, y: 0, z: 0 } }),
      }),
    ).ok,
    false,
  );
  assert.equal(
    stationaryForIndustrialSupport(
      obs({
        inWarp: false,
        snapshot: snapshot([], { mode: "STOP", velocity: ORIGIN }),
      }),
    ).ok,
    true,
  );
  assert.equal(
    stationaryForIndustrialSupport(
      obs({
        inWarp: null,
        snapshot: null,
        flightStatus: {
          inSpace: true,
          docked: false,
          solarSystemID: 30000142,
          stationID: null,
          structureID: null,
          shipID: 9001,
          shipMode: null,
          shipSpeedFraction: null,
        },
      }),
    ).ok,
    null,
  );
});

test("MTU targeting: cargo rows + deployable entities by group/name", () => {
  assert.equal(isMobileTractorUnitRow({ typeID: 33475, groupID: GROUP_MOBILE_TRACTOR_UNIT, categoryID: 22 }), true);
  assert.equal(isMobileTractorUnitRow({ typeID: 34, groupID: 18, categoryID: 4 }), false);
  assert.equal(
    isMobileTractorUnitEntity(entity({ itemID: 1, kind: "deployable", groupID: GROUP_MOBILE_TRACTOR_UNIT, name: "Mobile Tractor Unit" })),
    true,
  );
  assert.equal(
    isMobileTractorUnitEntity(entity({ itemID: 2, kind: "deployable", groupID: 1, name: "Mobile Tractor Unit" })),
    true,
  );
  assert.equal(isMobileTractorUnitEntity(entity({ itemID: 3, kind: "container", name: "Jetcan" })), false);

  const cargo = {
    rows: [
      { itemID: 10, typeID: 33475, groupID: GROUP_MOBILE_TRACTOR_UNIT, categoryID: 22, flagID: 5, quantity: 1, singleton: true },
      { itemID: 11, typeID: 34, groupID: 18, categoryID: 4, flagID: 5, quantity: 100, singleton: false },
    ],
    capacity: null,
  };
  assert.deepEqual(
    mtusInCargo(cargo).map((r) => r.itemID),
    [10],
  );
});

test("loot targeting: MTUs on grid + jetcans only within range", () => {
  const mtu = entity({
    itemID: 5001,
    kind: "deployable",
    groupID: GROUP_MOBILE_TRACTOR_UNIT,
    name: "Mobile Tractor Unit",
    ownerID: 42,
    position: { x: 1000, y: 0, z: 0 },
  });
  const nearCan = entity({
    itemID: 6001,
    kind: "container",
    name: "Jetcan",
    position: { x: 500, y: 0, z: 0 },
  });
  const farCan = entity({
    itemID: 6002,
    kind: "container",
    name: "Jetcan",
    position: { x: 50_000, y: 0, z: 0 },
  });
  const snap = snapshot([mtu, nearCan, farCan]);
  assert.equal(mtusOnGrid(snap).length, 1);
  assert.equal(pickMtuOnGrid(snap, 42)?.itemID, 5001);
  assert.equal(pickMtuOnGrid(snap, 99)?.itemID, 5001);

  const measurement: SpaceMeasurement = {
    distances: new Map([
      [5001, 1000],
      [6001, 500],
      [6002, 50_000],
    ]),
    shipMode: "STOP",
    shipRadius: 100,
  };
  const inRange = jetcansWithinRange(snap, measurement, INDUSTRIAL_LOOT_RANGE_M);
  assert.deepEqual(
    inRange.map((c) => c.itemID),
    [6001],
  );
  assert.deepEqual(jetcansWithinRange(snap, null), []);
});
