# Join a fleet from advert

Bot Builder macro id: `join-fleet-from-advert`.

Miner / applicant side of Standing Fleet Boss. Lists fleet-finder adverts visible to this character (`GetAvailableFleetAds` via `GET /api/bridge/fleet-ads`), optionally filters by advert name substring, and applies with `fleetProxy.ApplyToJoinFleet` (`POST /api/bridge/fleet/apply`). Finishes once `inFleet` is true.

Distinct from **Join a fleet** (`join-fleet`), which only waits for an `OnFleetInvite` and accepts it.

## Params

| Key | Kind | Required | Notes |
|-----|------|----------|-------|
| `advertName` | text | no | Case-insensitive substring of `fleetName`. Empty / omitted = first visible advert. |

## Sentence examples

- With filter: `Apply to join a fleet whose advert name contains Mining Ops`
- Without: `Apply to join the first available fleet advert`

## Try on :26501

1. Boss character: Bot Builder, Fleet category, **Run as Standing Fleet Boss** with a known advert name (corp/alliance/standings as appropriate).
2. Miner character: Bot Builder, Fleet category, **Join a fleet from advert**; set `advertName` to a substring of that name (or leave blank for first visible).
3. Confirm the apply when prompted; wait until the miner is in fleet (auto-join if the advert has joinNeedsApproval false, otherwise the boss auto-invite path must accept).

## Limitations

- Corp/alliance **name** filters are not wired (adverts expose leader corp/alliance **IDs** only; no Bot Builder corp/alliance name picker here). Use `advertName`.
- Visibility is session-filtered server-side (`isAdvertOpenToSession`); if the advert is not open to this character, it will not appear.
- Apply-from-advert **is** on the BFF (`/api/bridge/fleet/apply`); writes were never live-QA'd in the original plumbing pass — confirm gates still apply.
- If the advert requires approval and the boss is not running Standing Fleet Boss (or otherwise inviting), the step waits then blocks on timeout.
