// Cross-tab live-push (SSE) leadership.
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS
//
// Browsers share ~6 HTTP/1.1 connections PER ORIGIN across every tab of that
// origin. An EventSource pins one of those sockets for its whole life.
// In-tab multibox already keeps exactly one EventSource (the active pilot) —
// see App.svelte / livePush.test.ts. That does not help when the player opens
// THREE companion TABS: each tab opens its own EventSource, three sockets are
// gone before any poll runs, and under load the remaining three fill with hung
// gateway reads. New requests queue silently inside Chrome; the page looks
// like "clients drop after ~3".
//
// This module elects ONE tab (preferring the focused/visible one) to hold the
// live push channel. Other tabs keep working via ordinary polls — the same
// fallback background pilots use inside a single tab.
//
// Leadership is soft: a hidden tab releases; a focused visible tab claims;
// heartbeats recover if a leader crashes. A late-opening tab asks "hello" so
// it hears the current leader's ping before deciding to claim.

export type TabLivePushListener = (allowed: boolean) => void;

export interface TabLivePushGate {
  /** True while THIS tab may open an EventSource. */
  allowed(): boolean;
  /** Subscribe to leadership changes. Returns an unsubscribe. */
  subscribe(listener: TabLivePushListener): () => void;
  /** Tear down channel + timers (tests / hot reload). */
  dispose(): void;
}

export interface BroadcastChannelLike {
  postMessage(data: unknown): void;
  close(): void;
  onmessage: ((event: { data: unknown }) => void) | null;
}

export interface TabLivePushGateDeps {
  readonly channelName?: string;
  readonly tabId?: string;
  readonly heartbeatMs?: number;
  readonly staleMs?: number;
  readonly now?: () => number;
  readonly setInterval?: (handler: () => void, ms: number) => unknown;
  readonly clearInterval?: (handle: unknown) => void;
  readonly queueMicrotask?: (handler: () => void) => void;
  readonly addEventListener?: (
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ) => void;
  readonly removeEventListener?: (
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ) => void;
  /** Injected BroadcastChannel (tests). Default: browser BroadcastChannel. */
  readonly createChannel?: (name: string) => BroadcastChannelLike | null;
  /** Injected document visibility. Default: document.visibilityState. */
  readonly isVisible?: () => boolean;
  /** Injected window focus. Default: document.hasFocus(). */
  readonly hasFocus?: () => boolean;
}

const DEFAULT_CHANNEL = "evejs-web-companion-live-push-v1";
const DEFAULT_HEARTBEAT_MS = 2_000;
const DEFAULT_STALE_MS = 5_000;

type WireMessage = {
  readonly type: "claim" | "release" | "ping" | "hello";
  readonly tabId: string;
  readonly atMs: number;
};

function isWireMessage(value: unknown): value is WireMessage {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    (record.type === "claim" ||
      record.type === "release" ||
      record.type === "ping" ||
      record.type === "hello") &&
    typeof record.tabId === "string" &&
    record.tabId.length > 0 &&
    typeof record.atMs === "number" &&
    Number.isFinite(record.atMs)
  );
}

function defaultTabId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ? `tab-${uuid}` : `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function defaultCreateChannel(name: string): BroadcastChannelLike | null {
  if (typeof BroadcastChannel === "undefined") {
    return null;
  }
  try {
    return new BroadcastChannel(name) as unknown as BroadcastChannelLike;
  } catch {
    return null;
  }
}

/**
 * Create a per-tab gate that allows at most one companion tab to hold SSE.
 * Safe when BroadcastChannel is missing (Node tests / SSR): that tab is always
 * allowed, matching the single-tab historical behaviour.
 */
export function createTabLivePushGate(deps: TabLivePushGateDeps = {}): TabLivePushGate {
  const channelName = deps.channelName || DEFAULT_CHANNEL;
  const tabId = deps.tabId || defaultTabId();
  const heartbeatMs = deps.heartbeatMs ?? DEFAULT_HEARTBEAT_MS;
  const staleMs = deps.staleMs ?? DEFAULT_STALE_MS;
  const now = deps.now ?? (() => Date.now());
  const setTimer = deps.setInterval ?? ((handler, ms) => setInterval(handler, ms));
  const clearTimer =
    deps.clearInterval ?? ((handle) => clearInterval(handle as ReturnType<typeof setInterval>));
  const scheduleMicro =
    deps.queueMicrotask ?? ((handler) => queueMicrotask(handler));
  const addListener =
    deps.addEventListener ??
    ((type, listener, options) => {
      if (typeof document !== "undefined") {
        document.addEventListener(type, listener, options);
      }
      if (typeof window !== "undefined" && (type === "focus" || type === "blur")) {
        window.addEventListener(type, listener, options);
      }
    });
  const removeListener =
    deps.removeEventListener ??
    ((type, listener, options) => {
      if (typeof document !== "undefined") {
        document.removeEventListener(type, listener, options);
      }
      if (typeof window !== "undefined" && (type === "focus" || type === "blur")) {
        window.removeEventListener(type, listener, options);
      }
    });
  const isVisible =
    deps.isVisible ??
    (() => typeof document === "undefined" || document.visibilityState === "visible");
  const hasFocus =
    deps.hasFocus ??
    (() => {
      if (typeof document === "undefined") {
        return true;
      }
      return typeof document.hasFocus === "function" ? document.hasFocus() : true;
    });
  const createChannel = deps.createChannel ?? defaultCreateChannel;

  const listeners = new Set<TabLivePushListener>();
  let allowed = true;
  let disposed = false;
  let leaderId: string | null = null;
  let leaderAtMs = 0;
  let heartbeatHandle: unknown = null;

  const channel = createChannel(channelName);

  function publishAllowed(next: boolean): void {
    if (allowed === next) {
      return;
    }
    allowed = next;
    for (const listener of [...listeners]) {
      try {
        listener(allowed);
      } catch {
        // Listener errors must not break leadership.
      }
    }
  }

  function post(message: WireMessage): void {
    if (!channel) {
      return;
    }
    try {
      channel.postMessage(message);
    } catch {
      // Channel can close under us.
    }
  }

  function leaderIsFresh(): boolean {
    return leaderId !== null && now() - leaderAtMs < staleMs;
  }

  function claim(): void {
    leaderId = tabId;
    leaderAtMs = now();
    post({ type: "claim", tabId, atMs: leaderAtMs });
    publishAllowed(true);
  }

  function yieldTo(remoteId: string, atMs: number): void {
    leaderId = remoteId;
    leaderAtMs = atMs;
    publishAllowed(false);
  }

  function releaseIfLeader(): void {
    if (leaderId === tabId) {
      post({ type: "release", tabId, atMs: now() });
      leaderId = null;
      leaderAtMs = 0;
    }
    publishAllowed(false);
  }

  /**
   * Recompute whether this tab should hold SSE.
   * @param steal when true (focus), take leadership even if another tab leads.
   */
  function reconcile(steal: boolean): void {
    if (disposed) {
      return;
    }
    if (!channel) {
      publishAllowed(true);
      return;
    }
    if (!isVisible()) {
      releaseIfLeader();
      return;
    }
    if (leaderId === tabId) {
      claim();
      return;
    }
    if (steal || hasFocus() || !leaderIsFresh()) {
      claim();
      return;
    }
    publishAllowed(false);
  }

  function onRemote(message: WireMessage): void {
    if (message.tabId === tabId) {
      return;
    }
    if (message.type === "hello") {
      if (leaderId === tabId) {
        post({ type: "ping", tabId, atMs: leaderAtMs || now() });
      }
      return;
    }
    if (message.type === "release") {
      if (leaderId === message.tabId) {
        leaderId = null;
        leaderAtMs = 0;
        reconcile(false);
      }
      return;
    }
    // Another tab claimed or is heartbeating. Always yield on a remote claim —
    // fighting back here races forever when two tabs both think they have focus
    // (tests, multi-window). Local focus/visibility handlers re-steal if needed.
    yieldTo(message.tabId, message.atMs);
  }

  if (channel) {
    channel.onmessage = (event) => {
      if (isWireMessage(event.data)) {
        onRemote(event.data);
      }
    };
    // Do not open SSE until we have heard from peers (or decided we are alone).
    publishAllowed(false);
    post({ type: "hello", tabId, atMs: now() });
    scheduleMicro(() => {
      if (!disposed) {
        reconcile(hasFocus());
      }
    });
  } else {
    reconcile(true);
  }

  const onVisibility = () => reconcile(isVisible());
  const onFocus = () => reconcile(true);
  const onBlur = () => reconcile(false);
  addListener("visibilitychange", onVisibility);
  addListener("focus", onFocus);
  addListener("blur", onBlur);

  heartbeatHandle = setTimer(() => {
    if (disposed) {
      return;
    }
    if (leaderId === tabId && isVisible()) {
      leaderAtMs = now();
      post({ type: "ping", tabId, atMs: leaderAtMs });
      publishAllowed(true);
      return;
    }
    if (leaderId !== null && !leaderIsFresh()) {
      leaderId = null;
      leaderAtMs = 0;
    }
    reconcile(false);
  }, heartbeatMs);

  return {
    allowed: () => allowed,
    subscribe(listener) {
      listeners.add(listener);
      listener(allowed);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      disposed = true;
      if (heartbeatHandle !== null) {
        clearTimer(heartbeatHandle);
        heartbeatHandle = null;
      }
      removeListener("visibilitychange", onVisibility);
      removeListener("focus", onFocus);
      removeListener("blur", onBlur);
      if (leaderId === tabId) {
        post({ type: "release", tabId, atMs: now() });
      }
      try {
        channel?.close();
      } catch {
        // ignore
      }
      listeners.clear();
    },
  };
}


