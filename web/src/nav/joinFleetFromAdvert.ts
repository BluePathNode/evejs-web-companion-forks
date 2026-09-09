// Join a fleet from advert — pure helpers for the Bot Builder miner-side macro.
// Distinct from join-fleet (which waits for OnFleetInvite). This lists session-
// visible fleet-finder adverts (GetAvailableFleetAds) and applies via
// fleetProxy.ApplyToJoinFleet. Matching is name-substring only; leader corp/
// alliance IDs exist on the advert but Bot Builder has no corp/alliance name
// picker wired here (documented gap).

export interface FleetAdvertCandidate {
  readonly fleetID: number | null;
  readonly fleetName: string;
  readonly description: string;
  readonly leaderCorpID: number | null;
  readonly leaderAllianceID: number | null;
  readonly joinNeedsApproval: boolean;
  readonly numMembers: number;
}

export interface JoinFleetFromAdvertFilter {
  /** Case-insensitive substring of fleetName. Empty/absent = any visible advert. */
  readonly advertName: string;
}

/** Normalize the optional advert-name filter (trim; empty means "any"). */
export function normalizeAdvertNameFilter(raw: string | null | undefined): string {
  if (raw === null || raw === undefined) return "";
  return raw.trim();
}

/** True when the candidate's fleetName contains the filter (case-insensitive). */
export function advertNameMatches(fleetName: string, filter: string): boolean {
  const needle = normalizeAdvertNameFilter(filter);
  if (needle.length === 0) return true;
  return fleetName.toLowerCase().includes(needle.toLowerCase());
}

/**
 * Pick the first visible advert that matches the filter and has a usable fleetID.
 * Returns null when the listing is empty or nothing matches.
 */
export function pickMatchingFleetAdvert(
  ads: readonly FleetAdvertCandidate[] | null | undefined,
  filter: JoinFleetFromAdvertFilter,
): FleetAdvertCandidate | null {
  if (ads === null || ads === undefined || ads.length === 0) {
    return null;
  }
  const nameFilter = normalizeAdvertNameFilter(filter.advertName);
  for (const ad of ads) {
    if (ad.fleetID === null || !Number.isFinite(ad.fleetID) || ad.fleetID <= 0) {
      continue;
    }
    if (!advertNameMatches(ad.fleetName, nameFilter)) {
      continue;
    }
    return ad;
  }
  return null;
}

/** Prefer autoAccept when the advert does not require boss approval. */
export function autoAcceptForAdvert(ad: FleetAdvertCandidate): boolean {
  return !ad.joinNeedsApproval;
}
