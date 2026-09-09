// Fleet mining macros: empty-belt-home-tether-wait + fleet-warp-to-me + fleet-warp-to-broadcast.

import test from "node:test";
import assert from "node:assert/strict";

import type { FlightStatus, SpaceEntity, SpaceShipStatus, SpaceSnapshot, SpaceVector } from "../store/types.ts";
import type { ScriptObservation } from "./scriptConditions.ts";
import type { MacroStep } from "../bots/botScript.ts";
import { SCRIPT_MACROS } from "./scriptMacros.ts";

const ORIGIN: SpaceVector = { x: 0, y: 0, z: 0 };
const HOME_ID = 60003760;

function entity(over: Partial<SpaceEntity> & { itemID: number }): SpaceEntity {
  return {
    kind: "celestial", typeID: 1, groupID: 1, categoryID: 2, name: null, ownerID: null,
    radius: 10, position: ORIGIN, velocity: ORIGIN, isSelf: false,
    shieldRatio: null, armorRatio: null, hullRatio: null, characterID: null, corporationID: null,
    allianceID: null, securityStatus: null, maxVelocity: null, mode: null, capacitorRatio: null,
    remainingQuantity: null, miningYieldTypeID: null, beltID: null, isNpc: false, npcEntityType: null,
    controllerID: null, droneActivity: null, targetEntityID: null,
    ...over,
  };
}

function ship(over: Partial<SpaceShipStatus> = {}): SpaceShipStatus {
  return {
    itemID: 9001, typeID: 17476, name: "Procurer", mode: "STOP", maxVelocity: 100, radius: 100,
    position: ORIGIN, velocity: ORIGIN, shieldRatio: 1, armorRatio: 1, hullRatio: 1, capacitorRatio: 1,
    shieldCapacity: null, armorCapacity: null, hullCapacity: null, activeModuleIDs: [],
    ...over,
  } as SpaceShipStatus;
}

function snapshot(entities: SpaceEntity[], shipOver: Partial<SpaceShipStatus> = {}): SpaceSnapshot {
  return { inSpace: true, solarSystemID: 30000142, shipID: 9001, sampledAtMs: 1, entities, ship: ship(shipOver) };
}

function flight(over: Partial<FlightStatus> = {}): FlightStatus {
  return {
    inSpace: true, docked: false, solarSystemID: 30000142, stationID: null, structureID: null,
    shipID: 9001, shipMode: "STOP", shipSpeedFraction: 0, ...over,
  };
}

function obs(over: Partial<ScriptObservation> = {}): ScriptObservation {
  return {
    inSpace: true, docked: false, inWarp: false,
    shieldRatio: 1, armorRatio: 1, hullRatio: 1, health: 1,
    oreHoldFraction: 0, holdEmpty: true, hostileOnGrid: false, dronesOut: false,
    flightStatus: flight(), snapshot: snapshot([]), lockedTargetIDs: [], holds: null, droneBayItemIDs: [],
    miningModuleIDs: [], startingStationID: HOME_ID, homeStationID: HOME_ID, myCharacterID: 42,
    cargo: { rows: [], capacity: null }, inFleet: true,
    ...over,
  };
}

const homeStep: MacroStep = { id: "h", kind: "macro", macro: "empty-belt-home-tether-wait", args: {} };
const home = SCRIPT_MACROS["empty-belt-home-tether-wait"]!;
const warpStep: MacroStep = { id: "w", kind: "macro", macro: "fleet-warp-to-me", args: {} };
const warp = SCRIPT_MACROS["fleet-warp-to-me"]!;
const warpGated: MacroStep = {
  id: "wg",
  kind: "macro",
  macro: "fleet-warp-to-me",
  args: { greaterThan: { kind: "count", value: 2 } },
};

test("empty-belt-home-tether-wait: waits while rocks remain", () => {
  const rock = entity({
    itemID: 20, name: "Veldspar", kind: "asteroid", categoryID: 25, groupID: 450,
    position: { x: 200, y: 0, z: 0 }, remainingQuantity: 1000, miningYieldTypeID: 1230, beltID: 10,
  });
  const t = home(homeStep, obs({ snapshot: snapshot([rock]) }), {}, {});
  assert.equal(t.action.kind, "wait");
  assert.match(t.why, /waiting until empty/i);
  assert.equal(t.outcome.kind, "acting");
});

test("empty-belt-home-tether-wait: starts home route when belt empty", () => {
  const t = home(homeStep, obs({ snapshot: snapshot([]) }), {}, {});
  assert.equal(t.action.kind, "startRoute");
  if (t.action.kind === "startRoute") assert.equal(t.action.stationID, HOME_ID);
});

test("empty-belt-home-tether-wait: undocks at home then holds", () => {
  const docked = home(
    homeStep,
    obs({
      inSpace: false,
      docked: true,
      flightStatus: flight({ inSpace: false, docked: true, stationID: null, structureID: HOME_ID }),
      snapshot: null,
    }),
    { beltCleared: true },
    {},
  );
  assert.equal(docked.action.kind, "undock");
  assert.equal(docked.nextMem.holdingAtHome, true);

  const holding = home(
    homeStep,
    obs({ snapshot: snapshot([]) }),
    { beltCleared: true, holdingAtHome: true },
    {},
  );
  assert.equal(holding.action.kind, "wait");
  assert.equal(holding.outcome.kind, "acting");
  assert.match(holding.phase, /Holding at home/i);
});

test("empty-belt-home-tether-wait: blocks without home", () => {
  const t = home(
    homeStep,
    obs({ homeStationID: null, startingStationID: null, snapshot: snapshot([]) }),
    {},
    {},
  );
  assert.equal(t.outcome.kind, "blocked");
});

test("fleet-warp-to-me: broadcasts InPosition at ship", () => {
  const t = warp(warpStep, obs({ snapshot: snapshot([]) }), {}, {});
  assert.equal(t.action.kind, "fleetBroadcast");
  if (t.action.kind === "fleetBroadcast") {
    assert.equal(t.action.name, "InPosition");
    assert.equal(t.action.itemID, 9001);
    assert.equal(t.action.typeID, 17476);
  }
});

test("fleet-warp-to-me: done after broadcast latch", () => {
  const t = warp(warpStep, obs({ snapshot: snapshot([]) }), { broadcastSent: true }, {});
  assert.equal(t.outcome.kind, "done");
});

test("fleet-warp-to-me: optional greaterThan gate waits", () => {
  const rock = entity({
    itemID: 20, name: "Veldspar", kind: "asteroid", categoryID: 25, groupID: 450,
    remainingQuantity: 100, miningYieldTypeID: 1230, beltID: 10,
  });
  const t = warp(warpGated, obs({ snapshot: snapshot([rock]) }), {}, {});
  assert.equal(t.action.kind, "wait");
  assert.match(t.why, /need greater than 2/i);
});

test("fleet-warp-to-me: blocks when not in fleet", () => {
  const t = warp(warpStep, obs({ inFleet: false, snapshot: snapshot([]) }), {}, {});
  assert.equal(t.outcome.kind, "blocked");
});


const broadcastStep: MacroStep = { id: "b", kind: "macro", macro: "fleet-warp-to-broadcast", args: {} };
const broadcast = SCRIPT_MACROS["fleet-warp-to-broadcast"]!;

test("fleet-warp-to-broadcast: waits when no remembered broadcast", () => {
  const t = broadcast(
    broadcastStep,
    obs({ snapshot: snapshot([]), lastFleetBroadcast: null, fleetMemberCharacterIDs: [] }),
    {},
    {},
  );
  assert.equal(t.action.kind, "wait");
  assert.match(t.why, /waiting for a fleet location broadcast/i);
  assert.equal(t.outcome.kind, "acting");
});

test("fleet-warp-to-broadcast: warps to remembered broadcast itemID", () => {
  const t = broadcast(
    broadcastStep,
    obs({
      snapshot: snapshot([]),
      lastFleetBroadcast: {
        itemID: 7777,
        typeID: 17476,
        name: "InPosition",
        scope: "System",
        atMs: 1,
        fleetID: 99,
      },
      fleetMemberCharacterIDs: [42],
    }),
    {},
    {},
  );
  assert.equal(t.action.kind, "warp");
  if (t.action.kind === "warp") assert.equal(t.action.targetID, 7777);
});

test("fleet-warp-to-broadcast: done when broadcast target on grid after warp", () => {
  const boss = entity({
    itemID: 7777, kind: "ship", typeID: 17476, characterID: 99, name: "Orca",
    position: { x: 100, y: 0, z: 0 },
  });
  const t = broadcast(
    broadcastStep,
    obs({
      snapshot: snapshot([boss]),
      lastFleetBroadcast: {
        itemID: 7777, typeID: 17476, name: "InPosition", scope: "System", atMs: 1, fleetID: 99,
      },
      fleetMemberCharacterIDs: [99],
    }),
    { warpIssued: true, sawWarp: true },
    {},
  );
  assert.equal(t.outcome.kind, "done");
});

test("fleet-warp-to-broadcast: blocks when not in fleet", () => {
  const t = broadcast(
    broadcastStep,
    obs({
      inFleet: false,
      snapshot: snapshot([]),
      lastFleetBroadcast: { itemID: 1, typeID: 1, name: "InPosition", scope: "System", atMs: 1, fleetID: 1 },
    }),
    {},
    {},
  );
  assert.equal(t.outcome.kind, "blocked");
});

test("fleet-warp-to-broadcast: undocks when docked", () => {
  const t = broadcast(
    broadcastStep,
    obs({
      inSpace: false,
      docked: true,
      flightStatus: flight({ inSpace: false, docked: true, stationID: HOME_ID, structureID: null }),
      snapshot: null,
      lastFleetBroadcast: { itemID: 7777, typeID: 1, name: "InPosition", scope: "System", atMs: 1, fleetID: 1 },
    }),
    {},
    {},
  );
  assert.equal(t.action.kind, "undock");
});
