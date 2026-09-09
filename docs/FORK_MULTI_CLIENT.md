# Multi-client companion drops

## Prefer one tab + in-tab multibox

**Preferred setup:** open **one** companion tab at http://127.0.0.1:26501 and use **Add character** (in-tab multibox / R107). Do **not** open a separate tab per account.

Client = browser tab on the companion BFF. Not retail Eve / server bots.

## Two different failure modes

### A) Several companion tabs (~3 tabs) — EventSource / HTTP pool

Browsers share ~6 HTTP/1.1 connections **per origin** across every tab. Each tab EventSource pins one socket. Three tabs starve polls (Chrome silent queue = looks like drops).

- Not `maxClients=3`; not Docker OOM by itself.
- EveJS CPU / edge-owner load makes it worse (15s owner timeout; `EDGE_OWNER_OVERLOADED` when the queue is not draining).
- **Mitigation (already in fork):** `tabLivePushGate.ts` + `App.svelte` — BroadcastChannel elects one tab to hold SSE. Accidental multi-tab only; not the recommended way to fly multiple pilots.
- Verify: hard-refresh; open 4 tabs; only the focused/visible tab should hold live push.

### B) Three pilots in ONE tab — edge owner + shared transport (the real in-tab issue)

In-tab multibox already keeps **exactly one EventSource** (the active pilot). That is **not** what drops pilots 1/2 when the 3rd logs in.

What actually happens:

1. All pilots share one `bridgeLane` with `MAX_IN_FLIGHT=4` (`web/src/app/transport.ts`) — the browser origin budget is shared, not multiplied by roster size.
2. The **active** Workspace stays mounted while Add Character is an overlay (and during refresh restore once the first pilot is back), so space overview polls keep running (~2 Hz snapshot + targets) against EveJS.
3. Background pilots can still run mining / mission / custom **bot ticks** in memory (intentional multibox).
4. Bringing a new pilot online runs `SelectCharacterID` — a heavy EveJS edge-owner call (destiny bootstrap, session register, chat presence, …).
5. Under that load the edge owner backs up (`EDGE_OWNER_OVERLOADED` / `EDGE_OWNER_REQUEST_TIMEOUT`, 15s request timeout, admission cutoff at half). The UI then looks like clients “dropped” (health poll starvation, stalled selects, and in severe cases `SESSION_NOT_FOUND` / `NO_LIVE_SESSION` pruning a chip).

There is **no** hard-coded companion/gateway limit of 2 concurrent characters.

**Fix (this fork):** while Add Character is open **or** refresh restore is in progress, `App.svelte` calls `flow.setQuiesced(true)` on every online roster session: pause ticking bots, stop space polls, drop EventSource, yield transport lanes (`setForeground(false)`). When the join/restore finishes, quiesce ends and only bots that were running (not already player-paused) resume.

## Knobs / diagnostics

- Prefer **one tab** + Add character; use the multi-tab gate only if you accidentally open extra tabs.
- Before adding a 3rd+ pilot: dock or pause bots if you still see stalls (quiesce should cover the join itself).
- EveJS / companion load: `docker stats` (if applicable); set `EVEJS_COMPANION_DIAG=1` on the EveJS process for companion diag lines (`companionDiag` in `evejsWebGateway.js`).
- Edge owner: `requestTimeoutMs` default 15_000 on the gateway edge; companion BFF owner calls use 18_000 ms (`OWNER_CALL_TIMEOUT_MS` in `eveGatewayClient.js`).
- Client transport: `MAX_IN_FLIGHT=4`, `QUEUE_DEADLINE_MS=20_000` in `web/src/app/transport.ts`.

## Related code

- In-tab roster: `web/src/ui/App.svelte`, `web/src/app/sessions.ts`, `web/src/app/flow.ts` (`setLivePush`, `setForeground`, `setQuiesced`)
- Cross-tab SSE gate: `web/src/app/tabLivePushGate.ts`
- Shared lane: `web/src/app/transport.ts`
- Destiny suppress (CPU relief, not a client cap): EveJS `DESTINY_NOTIFICATION_NAME_FOR_SUPPRESSION` / `DoDestinyUpdate` in `evejsWebGatewayRuntime.js`
