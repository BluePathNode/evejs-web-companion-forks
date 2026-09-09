import test from "node:test";
import assert from "node:assert/strict";

import {
  advertNameMatches,
  autoAcceptForAdvert,
  normalizeAdvertNameFilter,
  pickMatchingFleetAdvert,
  type FleetAdvertCandidate,
} from "./joinFleetFromAdvert.ts";
import { SCRIPT_MACROS } from "./scriptMacros.ts";
import type { ScriptObservation } from "./scriptConditions.ts";
import { MACRO_SPECS } from "../bots/macroSpecs.ts";
import { macroName, stepSentence } from "../bots/scriptText.ts";
import { MACRO_CATALOG } from "../bots/macroCatalogView.ts";
import { MACRO_RUN_POLICY } from "../bots/runPolicy.ts";

const sampleAds: FleetAdvertCandidate[] = [
  {
    fleetID: 101,
    fleetName: "Mining Ops Alpha",
    description: "Belt mining",
    leaderCorpID: 10,
    leaderAllianceID: 20,
    joinNeedsApproval: false,
    numMembers: 3,
  },
  {
    fleetID: 202,
    fleetName: "Home Defense",
    description: "PVE",
    leaderCorpID: 11,
    leaderAllianceID: null,
    joinNeedsApproval: true,
    numMembers: 1,
  },
];

test("normalizeAdvertNameFilter trims and treats blank as any", () => {
  assert.equal(normalizeAdvertNameFilter("  Mining  "), "Mining");
  assert.equal(normalizeAdvertNameFilter("   "), "");
  assert.equal(normalizeAdvertNameFilter(null), "");
});

test("advertNameMatches is case-insensitive substring", () => {
  assert.equal(advertNameMatches("Mining Ops Alpha", "ops"), true);
  assert.equal(advertNameMatches("Mining Ops Alpha", "DEFENSE"), false);
  assert.equal(advertNameMatches("Home Defense", ""), true);
});

test("pickMatchingFleetAdvert returns first match with valid fleetID", () => {
  const any = pickMatchingFleetAdvert(sampleAds, { advertName: "" });
  assert.equal(any?.fleetID, 101);
  const named = pickMatchingFleetAdvert(sampleAds, { advertName: "defense" });
  assert.equal(named?.fleetID, 202);
  assert.equal(pickMatchingFleetAdvert(sampleAds, { advertName: "zzz" }), null);
  assert.equal(pickMatchingFleetAdvert([], { advertName: "" }), null);
});

test("autoAcceptForAdvert follows joinNeedsApproval", () => {
  assert.equal(autoAcceptForAdvert(sampleAds[0]!), true);
  assert.equal(autoAcceptForAdvert(sampleAds[1]!), false);
});

test("join-fleet-from-advert is registered in specs, catalog, text, policy, and SCRIPT_MACROS", () => {
  assert.ok(MACRO_SPECS["join-fleet-from-advert"]);
  assert.ok(MACRO_CATALOG["join-fleet-from-advert"]);
  assert.equal(macroName("join-fleet-from-advert"), "Join a fleet from advert");
  assert.ok(MACRO_RUN_POLICY["join-fleet-from-advert"]);
  assert.equal(typeof SCRIPT_MACROS["join-fleet-from-advert"], "function");
});

test("join-fleet-from-advert sentence mentions filter or first available", () => {
  const withName = {
    id: "s1",
    kind: "macro" as const,
    macro: "join-fleet-from-advert" as const,
    args: { advertName: { kind: "text" as const, text: "Mining Ops" } },
  };
  assert.match(stepSentence(withName), /Mining Ops/);
  const any = {
    id: "s2",
    kind: "macro" as const,
    macro: "join-fleet-from-advert" as const,
    args: {},
  };
  assert.match(stepSentence(any), /first available|advert/i);
});

test("join-fleet-from-advert dones when already in fleet", () => {
  const decide = SCRIPT_MACROS["join-fleet-from-advert"];
  const tick = decide(
    { id: "s1", kind: "macro", macro: "join-fleet-from-advert", args: {} },
    { inFleet: true } as unknown as ScriptObservation,
    {},
    {},
  );
  assert.equal(tick.outcome.kind, "done");
});

test("join-fleet-from-advert applies to the first matching advert", () => {
  const decide = SCRIPT_MACROS["join-fleet-from-advert"];
  const tick = decide(
    {
      id: "s1",
      kind: "macro",
      macro: "join-fleet-from-advert",
      args: { advertName: { kind: "text", text: "Mining" } },
    },
    {
      inFleet: false,
      availableFleetAds: sampleAds,
    } as unknown as ScriptObservation,
    {},
    {},
  );
  assert.equal(tick.outcome.kind, "acting");
  assert.equal(tick.action.kind, "applyToJoinFleet");
  if (tick.action.kind === "applyToJoinFleet") {
    assert.equal(tick.action.fleetID, 101);
    assert.equal(tick.action.autoAccept, true);
  }
});

test("join-fleet-from-advert waits after apply until in fleet", () => {
  const decide = SCRIPT_MACROS["join-fleet-from-advert"];
  const tick = decide(
    {
      id: "s1",
      kind: "macro",
      macro: "join-fleet-from-advert",
      args: { advertName: { kind: "text", text: "Defense" } },
    },
    {
      inFleet: false,
      availableFleetAds: sampleAds,
    } as unknown as ScriptObservation,
    { appliedFleetID: 202, waited: 2 },
    {},
  );
  assert.equal(tick.outcome.kind, "acting");
  assert.equal(tick.action.kind, "wait");
});

test("join-fleet-from-advert blocks when no matching advert is visible", () => {
  const decide = SCRIPT_MACROS["join-fleet-from-advert"];
  const tick = decide(
    {
      id: "s1",
      kind: "macro",
      macro: "join-fleet-from-advert",
      args: { advertName: { kind: "text", text: "zzz-missing" } },
    },
    {
      inFleet: false,
      availableFleetAds: sampleAds,
    } as unknown as ScriptObservation,
    {},
    {},
  );
  assert.equal(tick.outcome.kind, "blocked");
});
