<script lang="ts">
  // R107 — one pilot's button in the character bar: name, a docked/in-space dot,
  // and where they are, read live from that session's OWN store so a background
  // pilot's chip stays current as they fly. Clicking makes this pilot active.
  import { deriveDocked } from "./tabs.ts";
  import type { Session } from "../app/sessions.ts";

  let { session, active, onSelect }: {
    session: Session;
    active: boolean;
    onSelect: () => void;
  } = $props();

  // Stable session identity (App keys chips by session.id).
  // svelte-ignore state_referenced_locally
  const station = session.store.station;
  // svelte-ignore state_referenced_locally
  const flight = session.store.flight;

  const online = $derived($station.online);
  const isDocked = $derived(deriveDocked($flight.status, $station.online));
  // Short state word plus system when known. The full station name stays on the
  // hover title so chip widths stay uniform.
  const systemName = $derived(
    $station.station?.solarSystemName ?? $flight.solarSystemName ?? null,
  );
  const stateLabel = $derived(
    isDocked
      ? systemName
        ? `Docked · ${systemName}`
        : "Docked"
      : systemName
        ? `Space · ${systemName}`
        : "In space",
  );
  const where = $derived(
    $station.station?.stationName ??
      $station.station?.solarSystemName ??
      $flight.solarSystemName ??
      null,
  );
</script>

{#if online}
  <button
    type="button"
    class="char-chip"
    class:active
    onclick={onSelect}
    title={`${online.characterName} — ${stateLabel}${where ? ` · ${where}` : ""}`}
  >
    <span class="char-chip-dot" class:docked={isDocked} class:in-space={!isDocked}></span>
    <span class="char-chip-body">
      <span class="char-chip-name">{online.characterName}</span>
      <span class="char-chip-where">{stateLabel}</span>
    </span>
  </button>
{/if}
