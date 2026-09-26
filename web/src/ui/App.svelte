<script lang="ts">
  import CharacterBar from "./CharacterBar.svelte";
  import Onboarding from "./Onboarding.svelte";
  import Workspace from "./Workspace.svelte";
  import ErrorBoundary from "./ErrorBoundary.svelte";
  import AppGate from "./AppGate.svelte";
  import { createSession, type Session } from "../app/sessions.ts";
  import { createTabLivePushGate } from "../app/tabLivePushGate.ts";
  import {
    loadPersistedSessions,
    savePersistedSessions,
    type PersistedSessions,
  } from "../app/persistedSessions.ts";
  import { setSessionToken, clearSessionToken } from "../app/sessionToken.ts";
  import { getHealth } from "../app/api.ts";
  import { skipWhileBusy } from "../app/skipWhileBusy.ts";
  import { healthPollIntervalMs, resolveServerStatus } from "../app/serverStatus.ts";
  import type { LiveStreamStatus } from "../store/types.ts";

  const retained = loadPersistedSessions();
  const hasRetained = retained.pilots.length > 0;

  let sessions = $state<Session[]>([]);
  let activeId = $state<string | null>(null);
  let restoring = $state(hasRetained);
  let onboarding = $state<Session | null>(hasRetained ? null : createSession());

  const active = $derived(sessions.find((s) => s.id === activeId) ?? null);
  const tabLivePush = createTabLivePushGate();
  let tabMayHoldLivePush = $state(tabLivePush.allowed());
  $effect(() => {
    const stop = tabLivePush.subscribe((allowed) => {
      tabMayHoldLivePush = allowed;
    });
    return () => {
      stop();
      tabLivePush.dispose();
    };
  });

  async function restoreSessions(saved: PersistedSessions): Promise<void> {
    for (const pilot of saved.pilots) {
      const session = createSession();
      try {
        await session.flow.login(pilot.accountName, "");
        await session.flow.selectCharacter(pilot.characterID);
        sessions = [...sessions, session];
        if (activeId === null || pilot.characterID === saved.activeCharacterID) {
          activeId = session.id;
        }
      } catch {
        try {
          await session.flow.logout();
        } catch {
          /* best-effort teardown */
        }
      }
    }
    restoring = false;
    if (sessions.length === 0 && onboarding === null) {
      onboarding = createSession();
    }
  }

  let restoreStarted = false;
  $effect(() => {
    if (restoreStarted) return;
    restoreStarted = true;
    if (hasRetained) void restoreSessions(retained);
  });

  function completeOnboarding(): void {
    const s = onboarding;
    if (!s) return;
    sessions = [...sessions, s];
    activeId = s.id;
    onboarding = null;
  }

  function addCharacter(): void {
    if (onboarding) return;
    onboarding = createSession();
  }

  function cancelOnboarding(): void {
    const s = onboarding;
    onboarding = null;
    if (s) void s.flow.logout().catch(() => {});
  }

  function switchTo(id: string): void {
    activeId = id;
  }

  let onlineIDs = $state<Set<number>>(new Set());
  function recomputeOnline(): void {
    const ids = new Set<number>();
    for (const s of sessions) {
      const on = s.store.station.get().online;
      if (on) ids.add(on.characterID);
    }
    onlineIDs = ids;
  }

  function removeSession(id: string): void {
    const remaining = sessions.filter((s) => s.id !== id);
    if (remaining.length === sessions.length) return;
    sessions = remaining;
    if (activeId === id) {
      activeId = remaining.length > 0 ? remaining[remaining.length - 1].id : null;
    }
    if (remaining.length === 0 && onboarding === null) {
      onboarding = createSession();
    }
  }

  $effect(() => {
    const unsubs = sessions.map((s) =>
      s.store.station.subscribe((slice) => {
        if (slice.online === null) removeSession(s.id);
        recomputeOnline();
      }),
    );
    recomputeOnline();
    return () => {
      for (const unsub of unsubs) unsub();
    };
  });

  $effect(() => {
    const roster = sessions;
    const current = activeId;
    if (restoring) return;
    const pilots = roster
      .map((s) => {
        const snapshot = s.store.get();
        return snapshot.station.online && snapshot.session.username
          ? { accountName: snapshot.session.username, characterID: snapshot.station.online.characterID }
          : null;
      })
      .filter((p): p is { accountName: string; characterID: number } => p !== null);
    const activeCharacterID =
      roster.find((s) => s.id === current)?.store.get().station.online?.characterID ?? null;
    savePersistedSessions({ pilots, activeCharacterID });
  });

  $effect(() => {
    const joining = onboarding !== null || restoring;
    for (const s of sessions) {
      const isActive = s.id === activeId;
      s.flow.setQuiesced(joining);
      s.flow.setLivePush(!joining && isActive && tabMayHoldLivePush);
      s.flow.setForeground(!joining && isActive);
    }
  });

  $effect(() => {
    const token = active?.flow.sessionToken() ?? null;
    if (token) setSessionToken(token);
    else clearSessionToken();
  });

  let liveStatus = $state<LiveStreamStatus>("idle");
  $effect(() => {
    const signal = active?.store.live;
    if (!signal) {
      liveStatus = "idle";
      return;
    }
    return signal.subscribe((value) => {
      liveStatus = value.status;
    });
  });

  let healthReady = $state<boolean | null>(null);
  const serverStatus = $derived(resolveServerStatus({ live: liveStatus, healthReady }));

  $effect(() => {
    const intervalMs = healthPollIntervalMs(liveStatus);
    let cancelled = false;
    const ping = async (): Promise<void> => {
      try {
        const { ready } = await getHealth({ priority: "poll" });
        if (!cancelled) healthReady = ready;
      } catch {
        if (!cancelled) healthReady = false;
      }
    };
    const beat = skipWhileBusy(ping);
    void beat();
    const handle = setInterval(() => void beat(), intervalMs);
    return () => {
      cancelled = true;
      clearInterval(handle);
    };
  });
</script>

{#if active}
  <ErrorBoundary name="Character bar">
    <CharacterBar {sessions} {activeId} {serverStatus} onSwitch={switchTo} onAdd={addCharacter} />
  </ErrorBoundary>
  {#key active.id}
    <ErrorBoundary name="Cockpit">
      <Workspace store={active.store} flow={active.flow} />
    </ErrorBoundary>
  {/key}
{:else if restoring}
  <AppGate restoring />
{/if}

{#if onboarding}
  {#if active}
    <div class="onboarding-overlay">
      <div class="onboarding-frame">
        <div class="onboarding-frame-head">
          <span class="onboarding-frame-title">Add character</span>
          <button type="button" class="minor" onclick={cancelOnboarding}>Cancel</button>
        </div>
        <Onboarding store={onboarding.store} flow={onboarding.flow} {onlineIDs} onOnline={completeOnboarding} />
      </div>
    </div>
  {:else}
    <AppGate>
      <Onboarding store={onboarding.store} flow={onboarding.flow} {onlineIDs} onOnline={completeOnboarding} />
    </AppGate>
  {/if}
{/if}
