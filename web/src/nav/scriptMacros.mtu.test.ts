// Macro-level gates for deploy-mtu-and-loot (helpers covered separately).

import test from "node:test";
import assert from "node:assert/strict";

import type { FlightStatus, SpaceEntity, SpaceShipStatus, SpaceSnapshot, SpaceVector } from "../store/types.ts";
import type { MacroMemory } from "./scriptDecide.ts";
import type { ScriptObservation } from "./scriptConditions.ts";
import type { MacroStep } from "../bots/botScript.ts";
import { SCRIPT_MACROS } from "./scriptMacros.ts";
import { GROUP_MOBILE_TRACTOR_UNIT } from "./industrialMiningSupport.ts";

const ORIGIN: SpaceVector = { x: 0, y: 0, z: 0 };
const mtuStep: MacroStep = { id: "mtu", kind: "macro", macro: "deploy-mtu-and-loot", args: {} };
const mtu = SCRIPT_MACROS["deploy-mtu-and-loot"]!;

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
    itemID: 9001, typeID: 28606, name: "Orca", mode: "STOP", maxVelocity: 100, radius: 100,
    position: ORIGIN, velocity: ORIGIN, shieldRatio: 1, armorRatio: 1, hullRatio: 1, capacitorRatio: 1,
    shieldCapacity: null, armorCapacity: null, hullCapacity: null, activeModuleIDs: [],
    ...over,
  } as SpaceShipStatus;
}

function snapshot(entities: SpaceEntity[], shipOver: Partial<SpaceShipStatus> = {}): SpaceSnapshot {
  return { inSpace: true, solarSystemID: 30000142, shipID: 9001, sampledAtMs: 1, entities, ship: ship(shipOver) };
}

function flight(over: Partial<FlightStatus> = {}): FlightStatus {
  return { inSpace: true, docked: false, solarSystemID: 30000142, stationID: null, structureID: null, shipID: 9001, shipMode: "STOP", shipSpeedFraction: 0, ...over };
}

function obs(over: Partial<ScriptObservation> = {}): ScriptObservation {
  return {
    inSpace: true, docked: false, inWarp: false,
    shieldRatio: 1, armorRatio: 1, hullRatio: 1, health: 1,
    oreHoldFraction: 0, holdEmpty: true, hostileOnGrid: false, dronesOut: false,
    flightStatus: flight(), snapshot: snapshot([]), lockedTargetIDs: [], holds: null, droneBayItemIDs: [],
    miningModuleIDs: [], startingStationID: null, myCharacterID: 42, cargo: { rows: [], capacity: null },
    ...over,
  };
}

test("deploy-mtu-and-loot: non-industrial hull is blocked", () => {
  const t = mtu(mtuStep, obs({ snapshot: snapshot([], { typeID: 17476, name: "Procurer" }) }), {}, {});
  assert.equal(t.outcome.kind, "blocked");
  assert.match((t.outcome as { reason: string }).reason, /Orca|Porpoise|Rorqual/i);
});

test("deploy-mtu-and-loot: warping is blocked before deploy", () => {
  const t = mtu(mtuStep, obs({ inWarp: true, snapshot: snapshot([], { mode: "WARP" }) }), {}, {});
  assert.equal(t.outcome.kind, "blocked");
  assert.match((t.outcome as { reason: string }).reason, /stationary|warp/i);
});

test("deploy-mtu-and-loot: stationary Orca with MTU in cargo deploys", () => {
  const cargo = {
    rows: [
      { itemID: 77, typeID: 33475, groupID: GROUP_MOBILE_TRACTOR_UNIT, categoryID: 22, flagID: 5, quantity: 1, singleton: true },
    ],
    capacity: null,
  };
  const t = mtu(mtuStep, obs({ cargo, snapshot: snapshot([]) }), {}, {});
  assert.equal(t.action.kind, "launchFromShip");
  if (t.action.kind === "launchFromShip") {
    assert.deepEqual([...t.action.itemIDs], [77]);
  }
});

test("deploy-mtu-and-loot: loots in-range MTU then in-range jetcan; ignores far can", () => {
  const unit = entity({
    itemID: 5001,
    kind: "deployable",
    groupID: GROUP_MOBILE_TRACTOR_UNIT,
    name: "Mobile Tractor Unit",
    ownerID: 42,
    position: { x: 800, y: 0, z: 0 },
  });
  const nearCan = entity({ itemID: 6001, kind: "container", name: "Jetcan", position: { x: 400, y: 0, z: 0 } });
  const farCan = entity({ itemID: 6002, kind: "container", name: "Jetcan", position: { x: 80_000, y: 0, z: 0 } });
  const snap = snapshot([unit, nearCan, farCan]);
  const first = mtu(mtuStep, obs({ snapshot: snap }), {}, {});
  assert.equal(first.action.kind, "lootContainer");
  if (first.action.kind === "lootContainer") assert.equal(first.action.containerID, 5001);

  const afterMtu: MacroMemory = { ...first.nextMem, lootedMtuIDs: [5001], mtuLootIssued: 1 };
  const second = mtu(mtuStep, obs({ snapshot: snap }), afterMtu, {});
  assert.equal(second.action.kind, "lootContainer");
  if (second.action.kind === "lootContainer") assert.equal(second.action.containerID, 6001);
});
