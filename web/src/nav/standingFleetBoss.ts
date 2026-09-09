// Standing Fleet Boss — pure helpers for the composing fleet-advert macro.
// Invite-scope bitmasks match EveJS fleetConstants.js (INVITE_CORP / ALLIANCE / PUBLIC).
// Auto-accept is joinNeedsApproval:false; EveJS then invites applicants that pass
// isAdvertOpenToSession. public_minStanding is stored on the advert but EveJS does
// NOT currently gate ApplyToJoinFleet on it (documented gap).

export const FLEET_INVITE_CORP = 1;
export const FLEET_INVITE_ALLIANCE = 2;
export const FLEET_INVITE_PUBLIC = 8;

export const FLEET_ADVERT_NAME_MAX = 32;
export const FLEET_ADVERT_DESC_MAX = 250;

export type FleetAcceptByMode = "corp" | "alliance" | "standings";

export interface StandingFleetAdvertInput {
  readonly advertName: string;
  readonly advertDescription: string;
  readonly acceptBy: FleetAcceptByMode;
  /** Standing threshold (greater-than). Used for standings mode; ignored for corp/alliance. */
  readonly minStandings: number;
}

export interface FleetAdvertWritePayload {
  readonly fleetName: string;
  readonly description: string;
  readonly inviteScope: number;
  readonly public_minStanding: number | null;
  readonly membergroups_minStanding: number | null;
  readonly joinNeedsApproval: boolean;
  readonly useAdvanceOptions: boolean;
  readonly newPlayerFriendly: boolean;
  readonly updateOnBossChange: boolean;
  readonly hideInfo: boolean;
}

export interface FleetJoinApplicant {
  readonly charID: number | null;
  readonly corpID: number | null;
  readonly allianceID: number | null;
}

/** Map accept-by mode to EveJS inviteScope bitmask. */
export function inviteScopeForAcceptBy(acceptBy: FleetAcceptByMode): number {
  switch (acceptBy) {
    case "corp":
      return FLEET_INVITE_CORP;
    case "alliance":
      return FLEET_INVITE_ALLIANCE;
    case "standings":
      return FLEET_INVITE_PUBLIC;
  }
}

/** Build the plain advertData object for fleetProxy.AddFleetFinderAdvert. */
export function buildStandingFleetAdvertData(input: StandingFleetAdvertInput): FleetAdvertWritePayload {
  const fleetName = input.advertName.trim().slice(0, FLEET_ADVERT_NAME_MAX);
  const description = input.advertDescription.trim().slice(0, FLEET_ADVERT_DESC_MAX);
  const inviteScope = inviteScopeForAcceptBy(input.acceptBy);
  const standing =
    input.acceptBy === "standings" && Number.isFinite(input.minStandings)
      ? input.minStandings
      : null;
  return {
    fleetName,
    description,
    inviteScope,
    public_minStanding: standing,
    membergroups_minStanding: null,
    // Server auto-invites eligible applicants when approval is not required.
    joinNeedsApproval: false,
    useAdvanceOptions: input.acceptBy === "standings",
    newPlayerFriendly: false,
    updateOnBossChange: true,
    hideInfo: false,
  };
}

/**
 * Whether a pending join-request row matches the boss accept rule.
 * Corp/alliance compare the applicant's corp/alliance to the boss's.
 * Standings mode cannot verify player contacts here (EveJS standings reads are
 * NPC-facing); return true so a manual-approval fallback Invite still works,
 * and rely on the advert's stored public_minStanding for display / future gate.
 */
export function joinRequestMatchesAcceptBy(
  request: FleetJoinApplicant,
  acceptBy: FleetAcceptByMode,
  bossCorpID: number | null,
  bossAllianceID: number | null,
  _minStandings: number,
): boolean {
  const charID = request.charID;
  if (charID === null || !Number.isFinite(charID) || charID <= 0) {
    return false;
  }
  switch (acceptBy) {
    case "corp":
      return (
        bossCorpID !== null &&
        request.corpID !== null &&
        Number(request.corpID) === Number(bossCorpID)
      );
    case "alliance":
      return (
        bossAllianceID !== null &&
        bossAllianceID > 0 &&
        request.allianceID !== null &&
        Number(request.allianceID) === Number(bossAllianceID)
      );
    case "standings":
      return true;
  }
}

/** Standing comparison: applicantStanding must be STRICTLY greater than the threshold. */
export function standingGreaterThan(applicantStanding: number, threshold: number): boolean {
  return Number.isFinite(applicantStanding) && Number.isFinite(threshold) && applicantStanding > threshold;
}

/** True when an observed advert already matches the configured name/description/scope. */
export function advertMatchesConfig(
  live: {
    readonly fleetName: string;
    readonly description: string;
    readonly inviteScope: number;
    readonly public_minStanding: number | null;
    readonly joinNeedsApproval: boolean;
  } | null | undefined,
  input: StandingFleetAdvertInput,
): boolean {
  if (live === null || live === undefined) {
    return false;
  }
  const expected = buildStandingFleetAdvertData(input);
  if (live.fleetName !== expected.fleetName) return false;
  if (live.description !== expected.description) return false;
  if (live.inviteScope !== expected.inviteScope) return false;
  if (live.joinNeedsApproval !== expected.joinNeedsApproval) return false;
  if (expected.public_minStanding === null) {
    return live.public_minStanding === null || live.public_minStanding === undefined;
  }
  return live.public_minStanding === expected.public_minStanding;
}
