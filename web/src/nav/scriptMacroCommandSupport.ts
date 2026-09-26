// Command Burst + Industrial Core banks. Catalog/specs already list these
// MacroIDs; the production registry omitted the deciders and tsc failed
// CompleteMacroRegistry. Same shape as hardeners-on: one module per tick,
// unknown activeModuleIDs wait, none fitted blocks.

import type { MacroDecider, MacroMemory, MacroTick } from "./scriptDecide.ts";

const WAIT = { kind: "wait" } as const;
const ACTING = { kind: "acting" } as const;
const MAX_ATTEMPTS = 10;

function tick(
  action: MacroTick["action"],
  why: string,
  phase: string,
  outcome: MacroTick["outcome"],
  nextMem: MacroMemory = {},
): MacroTick {
  return { action, why, phase, armed: true, outcome, nextMem };
}

function attemptsOf(mem: MacroMemory): number {
  return typeof mem.attempts === "number" ? mem.attempts : 0;
}

export const commandBurstsOn: MacroDecider = (_step, obs, mem) => {
  const modules = obs.commandBurstModuleIDs ?? [];
  if (modules.length === 0) {
    return tick(WAIT, "Nothing to burst with.", "Command bursts", {
      kind: "blocked",
      reason: "This ship has no Command Burst module fitted.",
    });
  }
  if (obs.inSpace !== true) {
    return tick(WAIT, "Waiting to be in space (bursts only run out there).", "Command bursts", ACTING, mem);
  }
  const activeIDs = obs.snapshot?.ship?.activeModuleIDs ?? null;
  if (activeIDs === null) {
    return tick(
      WAIT,
      "Your ship did not say which equipment is running, so no burst was switched on.",
      "Command bursts",
      ACTING,
      mem,
    );
  }
  const active = new Set(activeIDs);
  const idle = modules.find((id) => !active.has(id));
  if (idle === undefined) {
    return tick(WAIT, "Every command burst is running.", "Command bursts", { kind: "done" });
  }
  const attempts = attemptsOf(mem) + 1;
  if (attempts > MAX_ATTEMPTS) {
    return tick(WAIT, "A command burst would not switch on.", "Command bursts", {
      kind: "blocked",
      reason: "A Command Burst kept refusing to switch on, so the bot stopped.",
    });
  }
  return tick(
    { kind: "activate", moduleID: idle, targetID: 0 },
    "Switching a command burst on.",
    "Command bursts",
    ACTING,
    { attempts },
  );
};

export const commandBurstsOff: MacroDecider = (_step, obs, mem) => {
  const modules = obs.commandBurstModuleIDs ?? [];
  if (modules.length === 0) {
    return tick(WAIT, "No command bursts fitted.", "Command bursts off", { kind: "done" });
  }
  if (obs.inSpace !== true) {
    return tick(WAIT, "Waiting to be in space.", "Command bursts off", ACTING, mem);
  }
  const activeIDs = obs.snapshot?.ship?.activeModuleIDs ?? null;
  if (activeIDs === null) {
    return tick(
      WAIT,
      "Your ship did not say which equipment is running, so no burst was switched off.",
      "Command bursts off",
      ACTING,
      mem,
    );
  }
  const active = new Set(activeIDs);
  const running = modules.find((id) => active.has(id));
  if (running === undefined) {
    return tick(WAIT, "Every command burst is off.", "Command bursts off", { kind: "done" });
  }
  const attempts = attemptsOf(mem) + 1;
  if (attempts > MAX_ATTEMPTS) {
    return tick(WAIT, "A command burst would not switch off.", "Command bursts off", {
      kind: "blocked",
      reason: "A Command Burst kept refusing to switch off, so the bot stopped.",
    });
  }
  return tick({ kind: "deactivate", moduleID: running }, "Switching a command burst off.", "Command bursts off", ACTING, {
    attempts,
  });
};

export const industrialCoreOn: MacroDecider = (_step, obs, mem) => {
  const modules = obs.industrialCoreModuleIDs ?? [];
  if (modules.length === 0) {
    return tick(WAIT, "No industrial core fitted.", "Industrial core", {
      kind: "blocked",
      reason: "This ship has no Industrial Core fitted (dread Siege / Triage do not count).",
    });
  }
  if (obs.inSpace !== true) {
    return tick(WAIT, "Waiting to be in space (the core only runs out there).", "Industrial core", ACTING, mem);
  }
  const activeIDs = obs.snapshot?.ship?.activeModuleIDs ?? null;
  if (activeIDs === null) {
    return tick(
      WAIT,
      "Your ship did not say which equipment is running, so the core was not switched on.",
      "Industrial core",
      ACTING,
      mem,
    );
  }
  const active = new Set(activeIDs);
  const idle = modules.find((id) => !active.has(id));
  if (idle === undefined) {
    return tick(WAIT, "The industrial core is running.", "Industrial core", { kind: "done" });
  }
  const attempts = attemptsOf(mem) + 1;
  if (attempts > MAX_ATTEMPTS) {
    return tick(WAIT, "The industrial core would not switch on.", "Industrial core", {
      kind: "blocked",
      reason: "The Industrial Core kept refusing to switch on, so the bot stopped.",
    });
  }
  return tick(
    { kind: "activate", moduleID: idle, targetID: 0 },
    "Switching the industrial core on.",
    "Industrial core",
    ACTING,
    { attempts },
  );
};

export const industrialCoreOff: MacroDecider = (_step, obs, mem) => {
  const modules = obs.industrialCoreModuleIDs ?? [];
  if (modules.length === 0) {
    return tick(WAIT, "No industrial core fitted.", "Industrial core off", { kind: "done" });
  }
  if (obs.inSpace !== true) {
    return tick(WAIT, "Waiting to be in space.", "Industrial core off", ACTING, mem);
  }
  const activeIDs = obs.snapshot?.ship?.activeModuleIDs ?? null;
  if (activeIDs === null) {
    return tick(
      WAIT,
      "Your ship did not say which equipment is running, so the core was not switched off.",
      "Industrial core off",
      ACTING,
      mem,
    );
  }
  const active = new Set(activeIDs);
  const running = modules.find((id) => active.has(id));
  if (running === undefined) {
    return tick(WAIT, "The industrial core is offline.", "Industrial core off", { kind: "done" });
  }
  const attempts = attemptsOf(mem) + 1;
  if (attempts > MAX_ATTEMPTS) {
    return tick(WAIT, "The industrial core would not switch off.", "Industrial core off", {
      kind: "blocked",
      reason: "The Industrial Core stayed on the active list, so the bot stopped.",
    });
  }
  return tick(
    { kind: "deactivate", moduleID: running },
    "Switching the industrial core off.",
    "Industrial core off",
    ACTING,
    { attempts },
  );
};
