// C (pure part) — the editor operations. The two that matter most for safety:
// the safety floor cannot be deleted, and a loop cannot be emptied into a no-op.

import test from "node:test";
import assert from "node:assert/strict";

import type { InterruptRow, LoopBlock, MacroStep, ProgramNode } from "./botScript.ts";
import {
  addInterrupt,
  duplicateNode,
  insertIntoLoop,
  insertNode,
  moveInLoop,
  moveNode,
  newInterrupt,
  newLoop,
  newMacroStep,
  removeFromLoop,
  removeInterrupt,
  removeNode,
  setInterruptFraction,
} from "./scriptEdit.ts";

// A deterministic id generator for tests.
function counter(): () => string {
  let n = 0;
  return () => `id${(n += 1)}`;
}

const floor: InterruptRow = {
  id: "floor", builtIn: "safety-floor",
  when: { kind: "health-below", fraction: 0.5 }, respond: "dock-and-pause",
};

function ids(program: readonly ProgramNode[]): string[] {
  return program.map((n) => n.id);
}

test("newMacroStep and newLoop produce well-formed, bounded pieces", () => {
  const make = counter();
  const step = newMacroStep("undock", make);
  assert.equal(step.kind, "macro");
  assert.equal(step.macro, "undock");
  const loop = newLoop(step, make);
  assert.equal(loop.kind, "loop");
  assert.equal(loop.repeat.kind, "times", "a new loop is bounded, never forever by default");
  assert.equal(loop.body.length, 1);
});

test("insert, remove, and move reorder the top level without mutating the input", () => {
  const make = counter();
  const a = newMacroStep("undock", make);
  const b = newMacroStep("deliver-ore", make);
  const program: readonly ProgramNode[] = [a];

  const withB = insertNode(program, b);
  assert.deepEqual(ids(withB), [a.id, b.id]);
  assert.deepEqual(ids(program), [a.id], "input unchanged");

  assert.deepEqual(ids(moveNode(withB, 0, 1)), [b.id, a.id]);
  assert.deepEqual(ids(moveNode(withB, 0, -1)), [a.id, b.id], "move up at the top edge is a no-op");
  assert.deepEqual(ids(removeNode(withB, 0)), [b.id]);
});

test("duplicate deep-copies with fresh ids, including a loop's body", () => {
  const make = counter();
  const inner = newMacroStep("mine-at-belt", make);
  const loop = newLoop(inner, make);
  const program: readonly ProgramNode[] = [loop];

  const dup = duplicateNode(program, 0, make);
  assert.equal(dup.length, 2);
  const copy = dup[1] as LoopBlock;
  assert.notEqual(copy.id, loop.id, "the loop copy has a fresh id");
  const copied = copy.body[0];
  assert.notEqual(copied?.id, inner.id, "the body step copy has a fresh id too");
  assert.ok(copied && copied.kind === "macro");
  assert.equal(copied.macro, "mine-at-belt", "contents are preserved");
});
test("duplicate deep-copies a branch's then/else with fresh ids", () => {
  const make = counter();
  const thenStep = newMacroStep("repair-ship", make);
  const elseStep = newMacroStep("refine-ore", make);
  const branch = {
    id: make(),
    kind: "branch" as const,
    when: { kind: "shield-below" as const, fraction: 0.5 },
    then: [thenStep],
    else: [elseStep],
  };
  const program: readonly ProgramNode[] = [branch];
  const dup = duplicateNode(program, 0, make);
  assert.equal(dup.length, 2);
  const copy = dup[1];
  assert.ok(copy && copy.kind === "branch");
  assert.notEqual(copy.id, branch.id, "the branch copy has a fresh id");
  assert.notEqual(copy.then[0]?.id, thenStep.id, "then-side steps get fresh ids");
  assert.notEqual(copy.else[0]?.id, elseStep.id, "else-side steps get fresh ids");
  // And the two copies must not share any id � otherwise a keyed {#each} over
  // either side (or a flattened advanced preview) throws each_key_duplicate.
  const idsOf = (n: ProgramNode): string[] => {
    if (n.kind === "branch") return [n.id, ...n.then.map((s) => s.id), ...n.else.map((s) => s.id)];
    if (n.kind === "loop") return [n.id, ...n.body.flatMap(idsOf)];
    return [n.id];
  };
  const all = [...idsOf(dup[0]!), ...idsOf(dup[1]!)];
  assert.equal(new Set(all).size, all.length, "no shared ids between original and duplicate");
});

test("loop-body edits work, and emptying a loop removes it", () => {
  const make = counter();
  const s1 = newMacroStep("mine-at-belt", make);
  const s2 = newMacroStep("deliver-ore", make);
  const loop: LoopBlock = { id: "L", kind: "loop", repeat: { kind: "times", count: 2 }, body: [s1, s2] };
  const program: readonly ProgramNode[] = [loop];

  const moved = moveInLoop(program, 0, 0, 1);
  assert.deepEqual((moved[0] as LoopBlock).body.map((s) => s.id), [s2.id, s1.id]);

  const s3 = newMacroStep("undock", make);
  const inserted = insertIntoLoop(program, 0, s3, 0);
  assert.deepEqual((inserted[0] as LoopBlock).body.map((s) => s.id), [s3.id, s1.id, s2.id]);

  const afterOne = removeFromLoop(program, 0, 0);
  assert.equal((afterOne[0] as LoopBlock).body.length, 1);
  const afterBoth = removeFromLoop(afterOne, 0, 0);
  assert.equal(afterBoth.length, 0, "removing the loop's last step removes the loop");
});

test("the safety floor cannot be deleted, but other interrupts can", () => {
  const make = counter();
  const shields = newInterrupt({ kind: "shield-below", fraction: 0.3 }, "dock-and-pause", make);
  const list = addInterrupt([floor], shields);
  assert.equal(list.length, 2);

  assert.deepEqual(removeInterrupt(list, floor.id), list, "removing the safety floor is refused");
  assert.deepEqual(removeInterrupt(list, shields.id).map((r) => r.id), [floor.id]);
});

test("setInterruptFraction edits the threshold, including on the safety floor", () => {
  const updated = setInterruptFraction([floor], floor.id, 0.35);
  const row = updated[0];
  assert.ok(row && row.when.kind === "health-below");
  assert.equal(row.when.fraction, 0.35);
});

test("out-of-range indices are no-ops, not crashes", () => {
  const make = counter();
  const a = newMacroStep("undock", make);
  const program: readonly ProgramNode[] = [a];
  assert.deepEqual(ids(removeNode(program, 5)), [a.id]);
  assert.deepEqual(ids(moveNode(program, 5, 1)), [a.id]);
  assert.deepEqual(ids(duplicateNode(program, 5, make)), [a.id]);
});
