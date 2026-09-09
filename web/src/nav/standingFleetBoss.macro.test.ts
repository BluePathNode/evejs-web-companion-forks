import test from "node:test";
import assert from "node:assert/strict";

import { SCRIPT_MACROS } from "./scriptMacros.ts";
import type { ScriptObservation } from "./scriptConditions.ts";
import { MACRO_SPECS } from "../bots/macroSpecs.ts";
import { macroName, stepSentence } from "../bots/scriptText.ts";
import { MACRO_CATALOG } from "../bots/macroCatalogView.ts";

test("standing-fleet-boss is registered in specs, catalog, text, and SCRIPT_MACROS", () => {
  assert.ok(MACRO_SPECS["standing-fleet-boss"]);
  assert.ok(MACRO_CATALOG["standing-fleet-boss"]);
  assert.equal(macroName("standing-fleet-boss"), "Run as Standing Fleet Boss");
  assert.equal(typeof SCRIPT_MACROS["standing-fleet-boss"], "function");
});

test("standing-fleet-boss sentence mentions advert name and accept rule", () => {
  const step = {
    id: "s1",
    kind: "macro" as const,
    macro: "standing-fleet-boss" as const,
    args: {
      advertName: { kind: "text" as const, text: "Home Defense" },
      advertDescription: { kind: "text" as const, text: "Come fly" },
      acceptBy: { kind: "fleetAcceptBy" as const, acceptBy: "standings" as const },
      minStandings: { kind: "standing" as const, value: 5 },
    },
  };
  const sentence = stepSentence(step);
  assert.match(sentence, /Home Defense/);
  assert.match(sentence, /standings greater than 5/);
});

test("standing-fleet-boss blocks when advert name is blank", () => {
  const decide = SCRIPT_MACROS["standing-fleet-boss"];
  const tick = decide(
    {
      id: "s1",
      kind: "macro",
      macro: "standing-fleet-boss",
      args: {
        advertName: { kind: "text", text: "   " },
        advertDescription: { kind: "text", text: "desc" },
        acceptBy: { kind: "fleetAcceptBy", acceptBy: "corp" },
      },
    },
    { inFleet: false } as unknown as ScriptObservation,
    {},
    {},
  );
  assert.equal(tick.outcome.kind, "blocked");
});

test("standing-fleet-boss forms a fleet when not in one", () => {
  const decide = SCRIPT_MACROS["standing-fleet-boss"];
  const tick = decide(
    {
      id: "s1",
      kind: "macro",
      macro: "standing-fleet-boss",
      args: {
        advertName: { kind: "text", text: "Roam" },
        advertDescription: { kind: "text", text: "Blues" },
        acceptBy: { kind: "fleetAcceptBy", acceptBy: "corp" },
      },
    },
    { inFleet: false } as unknown as ScriptObservation,
    {},
    {},
  );
  assert.equal(tick.outcome.kind, "acting");
  assert.equal(tick.action.kind, "createFleet");
});

test("standing-fleet-boss posts advert when in fleet without a matching advert", () => {
  const decide = SCRIPT_MACROS["standing-fleet-boss"];
  const tick = decide(
    {
      id: "s1",
      kind: "macro",
      macro: "standing-fleet-boss",
      args: {
        advertName: { kind: "text", text: "Roam" },
        advertDescription: { kind: "text", text: "Blues" },
        acceptBy: { kind: "fleetAcceptBy", acceptBy: "alliance" },
      },
    },
    { inFleet: true, fleetAdvertLive: false, fleetAdvert: null, fleetJoinRequests: [] } as unknown as ScriptObservation,
    {},
    {},
  );
  assert.equal(tick.outcome.kind, "acting");
  assert.equal(tick.action.kind, "postFleetAdvert");
  if (tick.action.kind === "postFleetAdvert") {
    assert.equal(tick.action.advertData.fleetName, "Roam");
    assert.equal(tick.action.advertData.inviteScope, 2);
    assert.equal(tick.action.advertData.joinNeedsApproval, false);
  }
});
