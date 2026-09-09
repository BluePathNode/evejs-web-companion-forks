const fs = require("fs");

// --- scriptEdit.test.ts: add branch deep-duplicate test ---
{
  const p = "web/src/bots/scriptEdit.test.ts";
  let s = fs.readFileSync(p, "utf8");
  if (!s.includes("duplicate deep-copies with fresh ids, including a loop's body")) {
    console.error("missing existing test");
    process.exit(1);
  }
  if (s.includes("duplicate deep-copies a branch's then/else with fresh ids")) {
    console.log("branch test already present");
  } else {
    const insertAfter = `test("duplicate deep-copies with fresh ids, including a loop's body", () => {
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
});`;
    const extra = `
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
  // And the two copies must not share any id — otherwise a keyed {#each} over
  // either side (or a flattened advanced preview) throws each_key_duplicate.
  const idsOf = (n: ProgramNode): string[] => {
    if (n.kind === "branch") return [n.id, ...n.then.map((s) => s.id), ...n.else.map((s) => s.id)];
    if (n.kind === "loop") return [n.id, ...n.body.flatMap(idsOf)];
    return [n.id];
  };
  const all = [...idsOf(dup[0]!), ...idsOf(dup[1]!)];
  assert.equal(new Set(all).size, all.length, "no shared ids between original and duplicate");
});`;
    s = s.replace(insertAfter, insertAfter + extra);
    fs.writeFileSync(p, s);
    console.log("added branch duplicate test");
  }
}

// Check imports in scriptEdit.test.ts for BranchBlock if needed - uses inline type
