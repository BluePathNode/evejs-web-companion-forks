import test from "node:test";
import assert from "node:assert/strict";

import {
  advertMatchesConfig,
  buildStandingFleetAdvertData,
  FLEET_INVITE_ALLIANCE,
  FLEET_INVITE_CORP,
  FLEET_INVITE_PUBLIC,
  inviteScopeForAcceptBy,
  joinRequestMatchesAcceptBy,
  standingGreaterThan,
} from "./standingFleetBoss.ts";

test("inviteScopeForAcceptBy maps corp / alliance / standings to EveJS bitmasks", () => {
  assert.equal(inviteScopeForAcceptBy("corp"), FLEET_INVITE_CORP);
  assert.equal(inviteScopeForAcceptBy("alliance"), FLEET_INVITE_ALLIANCE);
  assert.equal(inviteScopeForAcceptBy("standings"), FLEET_INVITE_PUBLIC);
});

test("buildStandingFleetAdvertData sets name, description, auto-accept, and standings threshold", () => {
  const corp = buildStandingFleetAdvertData({
    advertName: "  Home Defense Fleet  ",
    advertDescription: "Corp mates welcome",
    acceptBy: "corp",
    minStandings: 5,
  });
  assert.equal(corp.fleetName, "Home Defense Fleet");
  assert.equal(corp.description, "Corp mates welcome");
  assert.equal(corp.inviteScope, FLEET_INVITE_CORP);
  assert.equal(corp.public_minStanding, null);
  assert.equal(corp.joinNeedsApproval, false);

  const standings = buildStandingFleetAdvertData({
    advertName: "Standing roam",
    advertDescription: "Blues only",
    acceptBy: "standings",
    minStandings: 0,
  });
  assert.equal(standings.inviteScope, FLEET_INVITE_PUBLIC);
  assert.equal(standings.public_minStanding, 0);
  assert.equal(standings.useAdvanceOptions, true);
});

test("buildStandingFleetAdvertData truncates overlong name and description", () => {
  const longName = "N".repeat(80);
  const longDesc = "D".repeat(400);
  const payload = buildStandingFleetAdvertData({
    advertName: longName,
    advertDescription: longDesc,
    acceptBy: "alliance",
    minStandings: 1,
  });
  assert.equal(payload.fleetName.length, 32);
  assert.equal(payload.description.length, 250);
  assert.equal(payload.inviteScope, FLEET_INVITE_ALLIANCE);
});

test("joinRequestMatchesAcceptBy filters corp and alliance applicants", () => {
  const applicant = { charID: 140000099, corpID: 98000001, allianceID: 99000001 };
  assert.equal(joinRequestMatchesAcceptBy(applicant, "corp", 98000001, 99000001, 0), true);
  assert.equal(joinRequestMatchesAcceptBy(applicant, "corp", 98000002, 99000001, 0), false);
  assert.equal(joinRequestMatchesAcceptBy(applicant, "alliance", 98000001, 99000001, 0), true);
  assert.equal(joinRequestMatchesAcceptBy(applicant, "alliance", 98000001, null, 0), false);
  assert.equal(joinRequestMatchesAcceptBy(applicant, "standings", 98000001, 99000001, 5), true);
  assert.equal(
    joinRequestMatchesAcceptBy({ charID: null, corpID: 1, allianceID: 1 }, "corp", 1, 1, 0),
    false,
  );
});

test("standingGreaterThan is a strict greater-than check", () => {
  assert.equal(standingGreaterThan(5.1, 5), true);
  assert.equal(standingGreaterThan(5, 5), false);
  assert.equal(standingGreaterThan(4.9, 5), false);
  assert.equal(standingGreaterThan(Number.NaN, 0), false);
});

test("advertMatchesConfig compares live advert to the configured payload", () => {
  const input = {
    advertName: "Roam",
    advertDescription: "Come along",
    acceptBy: "corp" as const,
    minStandings: 0,
  };
  const expected = buildStandingFleetAdvertData(input);
  assert.equal(
    advertMatchesConfig(
      {
        fleetName: expected.fleetName,
        description: expected.description,
        inviteScope: expected.inviteScope,
        public_minStanding: expected.public_minStanding,
        joinNeedsApproval: expected.joinNeedsApproval,
      },
      input,
    ),
    true,
  );
  assert.equal(advertMatchesConfig(null, input), false);
  assert.equal(
    advertMatchesConfig(
      {
        fleetName: "Other",
        description: expected.description,
        inviteScope: expected.inviteScope,
        public_minStanding: expected.public_minStanding,
        joinNeedsApproval: expected.joinNeedsApproval,
      },
      input,
    ),
    false,
  );
});
