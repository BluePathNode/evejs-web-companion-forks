// Industrial mining support helpers for Orca / Porpoise / Rorqual Bot Builder
// macros. Pure over snapshot/cargo/observation — no network. Keep cohesive and
// small so future industrial actions can share the same ship/stationary gates.

import type { InventoryItemRow, SpaceEntity, SpaceSnapshot, SpaceShipStatus } from "../store/types.ts";
import type { ScriptObservation } from "./scriptConditions.ts";
import type { SpaceMeasurement } from "./autopilotLoop.ts";
import type { CargoReading } from "./missionBotLoop.ts";

/** Retail group: Mobile Tractor Unit (+ Packrat / Magpie / Consortium / …). */
export const GROUP_MOBILE_TRACTOR_UNIT = 1250;
/** Retail category: Deployable. */
export const CATEGORY_DEPLOYABLE = 22;

/** Hulls that are industrial command / capital industrial boosters. */
export const INDUSTRIAL_SUPPORT_SHIP_TYPE_IDS: ReadonlySet<number> = new Set([
  28606, // Orca
  42244, // Porpoise
  28352, // Rorqual
]);

/** Same transfer range loot-containers / wrecks use (under retail 2,500 m). */
export const INDUSTRIAL_LOOT_RANGE_M = 2400;

/** Treat near-zero velocity as parked (m/s). */
export const STATIONARY_SPEED_EPS_M_S = 0.5;

const INDUSTRIAL_NAME_RE = /\b(orca|porpoise|rorqual)\b/i;
const MTU_NAME_RE = /mobile\s+tractor/i;

export function isIndustrialSupportShipTypeID(typeID: number | null | undefined): boolean {
  return typeof typeID === "number" && typeID > 0 && INDUSTRIAL_SUPPORT_SHIP_TYPE_IDS.has(typeID);
}

/** True when this hull is an industrial booster by type id or known name. */
export function isIndustrialSupportShip(ship: SpaceShipStatus | null | undefined): boolean {
  if (!ship) return false;
  if (isIndustrialSupportShipTypeID(ship.typeID)) return true;
  return typeof ship.name === "string" && INDUSTRIAL_NAME_RE.test(ship.name);
}

export function isMobileTractorUnitRow(
  row: Pick<InventoryItemRow, "groupID" | "categoryID" | "typeID"> & { name?: string | null },
): boolean {
  if (row.groupID === GROUP_MOBILE_TRACTOR_UNIT) return true;
  if (
    row.categoryID === CATEGORY_DEPLOYABLE &&
    typeof row.name === "string" &&
    MTU_NAME_RE.test(row.name)
  ) {
    return true;
  }
  return false;
}

export function isMobileTractorUnitEntity(entity: SpaceEntity): boolean {
  if (entity.groupID === GROUP_MOBILE_TRACTOR_UNIT) return true;
  // Gateway may project MTUs as deployable without a group yet — name is the fallback.
  if (entity.kind === "deployable" && typeof entity.name === "string" && MTU_NAME_RE.test(entity.name)) {
    return true;
  }
  return false;
}

export function mtusOnGrid(snapshot: SpaceSnapshot | null): readonly SpaceEntity[] {
  if (snapshot === null) return [];
  return snapshot.entities.filter((e) => !e.isSelf && isMobileTractorUnitEntity(e));
}

/** Prefer an MTU owned by this character; otherwise any on grid. */
export function pickMtuOnGrid(
  snapshot: SpaceSnapshot | null,
  myCharacterID: number | null | undefined,
): SpaceEntity | null {
  const units = mtusOnGrid(snapshot);
  if (units.length === 0) return null;
  const me = myCharacterID ?? null;
  if (me !== null) {
    const mine = units.find((u) => u.ownerID === me);
    if (mine) return mine;
  }
  return units[0] ?? null;
}

export function mtusInCargo(cargo: CargoReading | null): readonly InventoryItemRow[] {
  if (cargo === null) return [];
  return cargo.rows.filter((row) => isMobileTractorUnitRow(row));
}

export function containersOnGrid(snapshot: SpaceSnapshot | null): readonly SpaceEntity[] {
  if (snapshot === null) return [];
  return snapshot.entities.filter((e) => e.kind === "container");
}

/** Jetcans (and other containers) already inside loot range — no approach. */
export function jetcansWithinRange(
  snapshot: SpaceSnapshot | null,
  measurement: BeltDistanceMap | null,
  rangeMeters: number = INDUSTRIAL_LOOT_RANGE_M,
): readonly SpaceEntity[] {
  const cans = containersOnGrid(snapshot);
  if (cans.length === 0) return [];
  if (measurement === null) {
    // Without distances we cannot honestly claim "within range".
    return [];
  }
  return cans.filter((c) => {
    const dist = measurement.distances.get(c.itemID);
    return typeof dist === "number" && dist <= rangeMeters;
  });
}

function shipModeLooksLikeWarp(mode: string | null | undefined): boolean {
  if (mode === null || mode === undefined) return false;
  const m = String(mode).toUpperCase();
  return m.includes("WARP");
}

function shipSpeed(ship: SpaceShipStatus | null | undefined): number | null {
  const v = ship?.velocity;
  if (!v) return null;
  const speed = Math.hypot(v.x, v.y, v.z);
  return Number.isFinite(speed) ? speed : null;
}

export type StationaryVerdict =
  | { readonly ok: true; readonly reason: null }
  | { readonly ok: false; readonly reason: string }
  | { readonly ok: null; readonly reason: string };

/**
 * Gate for deploy/loot on an industrial support ship: must not be warping, and
 * when mode/velocity are readable must look parked. Unknown reads wait — never
 * invent "stationary".
 */
export function stationaryForIndustrialSupport(obs: ScriptObservation): StationaryVerdict {
  if (obs.inWarp === true) {
    return { ok: false, reason: "Wait until the ship is out of warp — this block needs you stationary." };
  }
  const ship = obs.snapshot?.ship ?? null;
  const mode = ship?.mode ?? obs.flightStatus?.shipMode ?? null;
  if (shipModeLooksLikeWarp(mode)) {
    return { ok: false, reason: "Wait until the ship is out of warp — this block needs you stationary." };
  }
  const speed = shipSpeed(ship);
  if (speed !== null && speed > STATIONARY_SPEED_EPS_M_S) {
    return {
      ok: false,
      reason: "Stop the ship first — this block only deploys and loots while you are stationary.",
    };
  }
  if (obs.inWarp === null && mode === null && speed === null) {
    return { ok: null, reason: "Waiting to see whether the ship is stationary." };
  }
  return { ok: true, reason: null };
}

/** Belts on the current grid (overview name contains "belt"). */
export function beltsOnGrid(snapshot: SpaceSnapshot | null): readonly SpaceEntity[] {
  if (snapshot === null) return [];
  return snapshot.entities.filter((e) => !e.isSelf && /belt/i.test(e.name ?? ""));
}

/**
 * Pick the next belt: nearest by distance, or a deterministic-ish random among
 * candidates. `excludeIDs` skips belts already emptied / just left this run.
 */
export type BeltDistanceMap = { readonly distances: ReadonlyMap<number, number> };

export function pickNextBelt(
  belts: readonly SpaceEntity[],
  measurement: BeltDistanceMap | null,
  mode: "nearest" | "random",
  excludeIDs: ReadonlySet<number> = new Set(),
): SpaceEntity | null {
  const candidates = belts.filter((b) => !excludeIDs.has(b.itemID));
  if (candidates.length === 0) return null;
  if (mode === "nearest") {
    let best: SpaceEntity | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const belt of candidates) {
      const dist = measurement?.distances.get(belt.itemID) ?? Number.POSITIVE_INFINITY;
      if (dist < bestDist || (dist === bestDist && (best === null || belt.itemID < best.itemID))) {
        best = belt;
        bestDist = dist;
      }
    }
    return best;
  }
  // Random among candidates — stable-ish seed from ids so tests can override via Math.random.
  const idx = Math.floor(Math.random() * candidates.length);
  return candidates[idx] ?? null;
}
