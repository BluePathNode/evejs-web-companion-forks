<script lang="ts">
  // Full-viewport first screen: restore spinner or first-pilot login.
  // Presentation only — App still owns roster orchestration.
  import type { Snippet } from "svelte";

  let { restoring = false, children }: { restoring?: boolean; children?: Snippet } = $props();
</script>

<div class="app-gate" role={restoring ? "status" : undefined} aria-live={restoring ? "polite" : undefined}>
  <div class="app-gate-bg" aria-hidden="true"></div>
  <header class="app-gate-brand">
    <span class="app-gate-mark">EVEJS</span>
    <span class="app-gate-product">Companion</span>
  </header>
  {#if restoring}
    <p class="restoring-note">Restoring your pilots…</p>
  {:else}
    <p class="app-gate-tag">No-graphics client · one tab, many pilots</p>
    {@render children?.()}
  {/if}
</div>
