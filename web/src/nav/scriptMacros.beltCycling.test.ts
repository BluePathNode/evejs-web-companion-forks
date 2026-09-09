// Belt-cycling macros: wait-while-asteroids-above, empty-belt-cleanup-next, tractor-loot-jetcans.

import test from "node:test";
import assert from "node:assert/strict";

import type { FlightStatus, SpaceEntity, SpaceShipStatus, SpaceSnapshot, SpaceVector } from "../store/types.ts";
import type { MacroMemory } from "./scriptDecide.ts";
import type { ScriptObservation } from "./scriptConditions.ts";
import type { MacroStep } from "../bots/botScript.ts";
import { SCRIPT_MACROS } from "./scriptMacros.ts";
import { beltsOnGrid, pickNextBelt } from "./industrialMiningSupport.ts";
import { BELT_ARRIVAL_RADIUS_M } from "./miningBotLoop.ts";

const ORIGIN: SpaceVector = { x: 0, y: 0, z: 0 };

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

const waitStep: MacroStep = { id: "w", kind: "macro", macro: "wait-while-asteroids-above", args: {} };
const wait = SCRIPT_MACROS["wait-while-asteroids-above"]!;
const cleanStep: MacroStep = { id: "c", kind: "macro", macro: "empty-belt-cleanup-next", args: {} };
const clean = SCRIPT_MACROS["empty-belt-cleanup-next"]!;
const tractorStep: MacroStep = { id: "t", kind: "macro", macro: "tractor-loot-jetcans", args: {} };
const tractor = SCRIPT_MACROS["tractor-loot-jetcans"]!;

test("pickNextBelt nearest excludes ids", () => {
  const a = entity({ itemID: 1, name: "Asteroid Belt 1", position: { x: 100_000, y: 0, z: 0 } });
  const b = entity({ itemID: 2, name: "Asteroid Belt 2", position: { x: 50_000, y: 0, z: 0 } });
  const snap = snapshot([a, b]);
  const belts = beltsOnGrid(snap);
  const measurement = {
    distances: new Map<number, number>([
      [1, 100_000],
      [2, 50_000],
    ]),
  };
  assert.equal(pickNextBelt(belts, measurement, "nearest")?.itemID, 2);
  assert.equal(pickNextBelt(belts, measurement, "nearest", new Set([2]))?.itemID, 1);
});

test("wait-while-asteroids-above: warps to nearest belt when far", () => {
  const belt = entity({
    itemID: 10,
    name: "Asteroid Belt 1",
    position: { x: BELT_ARRIVAL_RADIUS_M + 50_000, y: 0, z: 0 },
  });
  const t = wait(waitStep, obs({ snapshot: snapshot([belt]) }), {}, {});
  assert.equal(t.action.kind, "warp");
  if (t.action.kind === "warp") assert.equal(t.action.targetID, 10);
});

test("wait-while-asteroids-above: waits while count greater than threshold", () => {
  const belt = entity({ itemID: 10, name: "Asteroid Belt 1", position: { x: 100, y: 0, z: 0 } });
  // Mineable rock: category asteroid / group — use miningBotLoop shape via kind asteroid if needed.
  // isMineableRock checks category/group; set categoryID for asteroid (25 is ore; rocks use kind/group).
  const rock = entity({
    itemID: 20,
    name: "Veldspar",
    kind: "asteroid",
    categoryID: 25,
    groupID: 450,
    position: { x: 200, y: 0, z: 0 },
    remainingQuantity: 1000,
    miningYieldTypeID: 1230,
    beltID: 10,
  });
  const step: MacroStep = {
    id: "w",
    kind: "macro",
    macro: "wait-while-asteroids-above",
    args: { greaterThan: { kind: "count", value: 0 } },
  };
  // greaterThan 0 with 1 rock => wait
  const t = wait(step, obs({ snapshot: snapshot([belt, rock]) }), { arrived: true }, {});
  assert.equal(t.action.kind, "wait");
  assert.equal(t.outcome.kind, "acting");
  assert.match(t.why, /waiting while greater than 0/i);
});

test("wait-while-asteroids-above: done when count not greater than threshold", () => {
  const belt = entity({ itemID: 10, name: "Asteroid Belt 1", position: { x: 100, y: 0, z: 0 } });
  const step: MacroStep = {
    id: "w",
    kind: "macro",
    macro: "wait-while-asteroids-above",
    args: { greaterThan: { kind: "count", value: 1 } },
  };
  const t = wait(step, obs({ snapshot: snapshot([belt]) }), { arrived: true }, {});
  assert.equal(t.outcome.kind, "done");
});

test("empty-belt-cleanup-next: idles while rocks remain", () => {
  const belt = entity({ itemID: 10, name: "Asteroid Belt 1", position: { x: 100, y: 0, z: 0 } });
  const rock = entity({
    itemID: 20,
    name: "Veldspar",
    kind: "asteroid",
    categoryID: 25,
    groupID: 450,
    position: { x: 200, y: 0, z: 0 },
    remainingQuantity: 100,
    miningYieldTypeID: 1230,
    beltID: 10,
  });
  const t = clean(cleanStep, obs({ snapshot: snapshot([belt, rock]) }), {}, {});
  assert.equal(t.outcome.kind, "acting");
  assert.match(t.why, /waiting until empty/i);
});

test("empty-belt-cleanup-next: notes MTU scoop gap then warps to other belt", () => {
  const here = entity({ itemID: 10, name: "Asteroid Belt 1", position: { x: 100, y: 0, z: 0 } });
  const other = entity({
    itemID: 11,
    name: "Asteroid Belt 2",
    position: { x: BELT_ARRIVAL_RADIUS_M + 80_000, y: 0, z: 0 },
  });
  const mtu = entity({
    itemID: 5001,
    kind: "deployable",
    groupID: 1250,
    name: "Mobile Tractor Unit",
    ownerID: 42,
    position: { x: 500, y: 0, z: 0 },
  });
  const first = clean(cleanStep, obs({ snapshot: snapshot([here, other, mtu]) }), {}, {});
  assert.equal(first.outcome.kind, "acting");
  assert.match(first.why, /scooping deployables is not available/i);
  const mem: MacroMemory = { ...first.nextMem, mtuScoopNoted: true };
  const second = clean(cleanStep, obs({ snapshot: snapshot([here, other, mtu]), dronesOut: false }), mem, {});
  assert.equal(second.action.kind, "warp");
  if (second.action.kind === "warp") assert.equal(second.action.targetID, 11);
});

test("tractor-loot-jetcans: blocked without tractor modules", () => {
  const can = entity({ itemID: 6001, kind: "container", name: "Jetcan", position: { x: 400, y: 0, z: 0 } });
  const t = tractor(tractorStep, obs({ snapshot: snapshot([can]), tractorModuleIDs: [] }), {}, {});
  assert.equal(t.outcome.kind, "blocked");
  assert.match((t.outcome as { reason: string }).reason, /tractor beams/i);
});

test("tractor-loot-jetcans: loots can already in range", () => {
  const can = entity({ itemID: 6001, kind: "container", name: "Jetcan", position: { x: 400, y: 0, z: 0 } });
  const t = tractor(
    tractorStep,
    obs({ snapshot: snapshot([can]), tractorModuleIDs: [901], lockedTargetIDs: [6001] }),
    {},
    {},
  );
  assert.equal(t.action.kind, "lootContainer");
  if (t.action.kind === "lootContainer") assert.equal(t.action.containerID, 6001);
});

test("tractor-loot-jetcans: locks then activates tractor when farther", () => {
  const can = entity({
    itemID: 6001,
    kind: "container",
    name: "Jetcan",
    position: { x: 10_000, y: 0, z: 0 },
  });
  const first = tractor(
    tractorStep,
    obs({ snapshot: snapshot([can]), tractorModuleIDs: [901], lockedTargetIDs: [] }),
    {},
    {},
  );
  assert.equal(first.action.kind, "lock");
  const second = tractor(
    tractorStep,
    obs({ snapshot: snapshot([can], { activeModuleIDs: [] }), tractorModuleIDs: [901], lockedTargetIDs: [6001] }),
    {},
    {},
  );
  assert.equal(second.action.kind, "activate");
  if (second.action.kind === "activate") {
    assert.equal(second.action.moduleID, 901);
    assert.equal(second.action.targetID, 6001);
  }
});
