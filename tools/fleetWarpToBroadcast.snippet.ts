
// --- fleet-warp-to-broadcast --------------------------------------------------
// Miner pair for fleet-warp-to-me. EveJS has SendBroadcast but no GetBroadcast /
// WarpFleet / WarpToMember. This companion remembers the last successful
// SendBroadcast per fleetID (fork BFF cache). Miner waits for that ping, warps
// via CmdWarpToStuff to the broadcast itemID (boss ship), done on arrival.
// LIMITATION: warping to an off-grid ship itemID may be refused by beyonce --
// live QA owed; if it fails after bounded tries, block with a clear reason
// (manual fleet-history warp-to-broadcast may still work in the game UI).
const FLEET_BROADCAST_ARRIVAL_M = BELT_ARRIVAL_RADIUS_M;

const fleetWarpToBroadcast: MacroDecider = (_step, obs, mem) => {
  if (obs.inWarp === true) {
    return tick(WAIT, "In warp -- nothing decided mid-warp.", "Warping to fleet broadcast", ACTING, false, {
      ...mem,
      sawWarp: true,
    });
  }

  if (obs.flightStatus?.docked === true) {
    return tick({ kind: "undock" }, "Undocking so we can warp to the fleet broadcast.", "Undocking", ACTING, false, mem);
  }
  if (obs.inSpace !== true) {
    return tick(WAIT, "Waiting for the ship to be out in space.", "Warping to fleet broadcast", ACTING, false, mem);
  }

  const inFleet = obs.inFleet ?? null;
  if (inFleet === null) {
    return tick(WAIT, "Checking your fleet status.", "Warping to fleet broadcast", ACTING, false, mem);
  }
  if (inFleet === false) {
    return tick(WAIT, "You are not in a fleet.", "Warping to fleet broadcast", {
      kind: "blocked",
      reason: "Join a fleet first -- this block warps to the boss location broadcast.",
    });
  }

  const snapshot = obs.snapshot ?? null;
  if (snapshot === null) {
    return tick(WAIT, "Reading the grid.", "Warping to fleet broadcast", ACTING, false, mem);
  }

  const broadcast = obs.lastFleetBroadcast ?? null;
  const mates = fleetMatesOnGrid(obs);
  if (mates === null) {
    return tick(WAIT, "Reading the fleet roster.", "Warping to fleet broadcast", ACTING, false, mem);
  }

  const targetID =
    broadcast !== null && typeof broadcast.itemID === "number" && broadcast.itemID > 0
      ? broadcast.itemID
      : null;

  const measurement = measureSpace(snapshot);
  const onGridTarget =
    targetID !== null ? snapshot.entities.find((e) => e.itemID === targetID) ?? null : null;

  if (onGridTarget !== null) {
    const dist = measurement?.distances.get(onGridTarget.itemID) ?? 0;
    if (dist <= FLEET_BROADCAST_ARRIVAL_M || flag(mem, "sawWarp") || flag(mem, "warpIssued")) {
      return tick(
        WAIT,
        "Arrived on the fleet broadcast / boss grid.",
        "At fleet broadcast",
        { kind: "done" },
      );
    }
  }

  if (targetID === null && mates.length > 0) {
    return tick(
      WAIT,
      "No remembered broadcast yet, but a fleet-mate is already on your grid.",
      "At fleet broadcast",
      { kind: "done" },
    );
  }

  if (targetID === null) {
    return tick(
      WAIT,
      "Waiting for a fleet location broadcast (boss Broadcast fleet warp to me on this companion).",
      "Waiting for broadcast",
      ACTING,
      true,
      mem,
    );
  }

  if (onGridTarget !== null) {
    const dist = measurement?.distances.get(onGridTarget.itemID) ?? Number.POSITIVE_INFINITY;
    if (dist > FLEET_BROADCAST_ARRIVAL_M) {
      const tries = (num(mem, "tries") ?? 0) + 1;
      if (tries > MAX_BLOCK_ATTEMPTS) {
        return tick(WAIT, "Could not close on the broadcast target.", "Warping to fleet broadcast", {
          kind: "blocked",
          reason:
            "Warp to the fleet broadcast target did not land after several tries. EveJS has no WarpToMember; CmdWarpToStuff to the broadcast item may be refused -- try a manual fleet-history warp.",
        });
      }
      return tick(
        { kind: "warp", targetID },
        "Warping to the fleet broadcast target on grid.",
        "Warping to fleet broadcast",
        ACTING,
        false,
        { ...mem, tries, warpIssued: true },
      );
    }
  }

  const tries = (num(mem, "tries") ?? 0) + 1;
  if (tries > MAX_BLOCK_ATTEMPTS) {
    return tick(WAIT, "The fleet broadcast warp would not start.", "Warping to fleet broadcast", {
      kind: "blocked",
      reason:
        "CmdWarpToStuff to the remembered broadcast itemID failed after several tries. EveJS exposes no WarpToMember / GetBroadcast -- manual warp-to-broadcast in the fleet window may still work.",
    });
  }

  return tick(
    { kind: "warp", targetID },
    "Warping to the last fleet location broadcast (boss ship ping).",
    "Warping to fleet broadcast",
    ACTING,
    false,
    { ...mem, tries, warpIssued: true },
  );
};

