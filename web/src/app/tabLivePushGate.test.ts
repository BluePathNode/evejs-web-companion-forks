// Cross-tab SSE leadership: only one companion tab may hold EventSource.

import test from "node:test";
import assert from "node:assert/strict";

import {
  createTabLivePushGate,
  type BroadcastChannelLike,
  type TabLivePushGate,
} from "./tabLivePushGate.ts";

class FakeChannel implements BroadcastChannelLike {
  static peers = new Map<string, Set<FakeChannel>>();
  onmessage: ((event: { data: unknown }) => void) | null = null;
  closed = false;
  name: string;
  constructor(name: string) {
    this.name = name;
    let set = FakeChannel.peers.get(name);
    if (!set) {
      set = new Set();
      FakeChannel.peers.set(name, set);
    }
    set.add(this);
  }
  postMessage(data: unknown): void {
    if (this.closed) {
      return;
    }
    const set = FakeChannel.peers.get(this.name);
    if (!set) {
      return;
    }
    for (const peer of set) {
      if (peer === this || peer.closed) {
        continue;
      }
      peer.onmessage?.({ data });
    }
  }
  close(): void {
    this.closed = true;
    FakeChannel.peers.get(this.name)?.delete(this);
  }
  static reset(): void {
    FakeChannel.peers.clear();
  }
}

const microtasks: Array<() => void> = [];

function flushMicrotasks(): void {
  while (microtasks.length > 0) {
    const next = microtasks.shift();
    if (next) {
      next();
    }
  }
}

function makeGate(
  tabId: string,
  options: {
    visible?: () => boolean;
    focused?: () => boolean;
    now?: () => number;
  } = {},
): TabLivePushGate {
  return createTabLivePushGate({
    channelName: "test-live-push",
    tabId,
    heartbeatMs: 1000,
    staleMs: 3000,
    now: options.now || (() => 1_000),
    isVisible: options.visible || (() => true),
    hasFocus: options.focused || (() => false),
    createChannel: (name) => new FakeChannel(name),
    addEventListener: () => {},
    removeEventListener: () => {},
    setInterval: () => 1,
    clearInterval: () => {},
    queueMicrotask: (handler) => {
      microtasks.push(handler);
    },
  });
}

test("without BroadcastChannel the tab stays allowed (single-tab fallback)", () => {
  FakeChannel.reset();
  microtasks.length = 0;
  const gate = createTabLivePushGate({
    tabId: "solo",
    createChannel: () => null,
    addEventListener: () => {},
    removeEventListener: () => {},
    setInterval: () => 1,
    clearInterval: () => {},
  });
  assert.equal(gate.allowed(), true);
  gate.dispose();
});

test("two visible tabs: focused claimer holds SSE; unfocused yields", () => {
  FakeChannel.reset();
  microtasks.length = 0;
  const a = makeGate("tab-a", { focused: () => true });
  flushMicrotasks();
  const b = makeGate("tab-b", { focused: () => false });
  flushMicrotasks();
  assert.equal(a.allowed(), true);
  assert.equal(b.allowed(), false);
  a.dispose();
  b.dispose();
});

test("leader dispose releases; other visible tab takes over", () => {
  FakeChannel.reset();
  microtasks.length = 0;
  const a = makeGate("tab-a", { focused: () => true });
  flushMicrotasks();
  const b = makeGate("tab-b", { focused: () => false, visible: () => true });
  flushMicrotasks();
  assert.equal(a.allowed(), true);
  assert.equal(b.allowed(), false);
  a.dispose();
  assert.equal(b.allowed(), true);
  b.dispose();
});

test("focused tab steals leadership from a background leader", () => {
  FakeChannel.reset();
  microtasks.length = 0;
  const background = makeGate("tab-bg", { focused: () => true });
  flushMicrotasks();
  assert.equal(background.allowed(), true);

  const foreground = makeGate("tab-fg", { focused: () => true });
  flushMicrotasks();
  assert.equal(foreground.allowed(), true);
  assert.equal(background.allowed(), false);

  background.dispose();
  foreground.dispose();
});

test("subscribe receives the current allowance immediately", () => {
  FakeChannel.reset();
  microtasks.length = 0;
  const gate = makeGate("tab-sub", { focused: () => true });
  const seen: boolean[] = [];
  const stop = gate.subscribe((allowed) => seen.push(allowed));
  // Channel tabs start denied until the hello microtask claims.
  assert.deepEqual(seen, [false]);
  flushMicrotasks();
  assert.equal(gate.allowed(), true);
  stop();
  gate.dispose();
});
