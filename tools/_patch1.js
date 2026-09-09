const fs = require("fs");

// --- scriptEdit.ts: fix cloneWithFreshIds and export it ---
{
  const p = "web/src/bots/scriptEdit.ts";
  let s = fs.readFileSync(p, "utf8");
  const old = `function cloneWithFreshIds(node: ProgramNode, makeId: IdGen): ProgramNode {
  const cloned = structuredClone(node) as ProgramNode;
  if (cloned.kind === "loop") {
    return { ...cloned, id: makeId(), body: cloned.body.map((step) => ({ ...step, id: makeId() })) };
  }
  return { ...cloned, id: makeId() };
}`;
  const neu = `/**
 * Deep-copy a program node with fresh ids at every nesting level.
 *
 * ? A shallow "new top-level id only" clone is not enough for the Bot Builder:
 * a branch's then/else steps (and a loop body's nested branch sides) are each
 * rendered with a keyed \`{#each}\`. Leaving those nested ids shared with the
 * original would throw \`each_key_duplicate\` the moment both copies are on
 * screen — or when a flattened advanced preview concatenates both sides.
 */
export function cloneNodeWithFreshIds(node: ProgramNode, makeId: IdGen): ProgramNode {
  const cloned = structuredClone(node) as ProgramNode;
  if (cloned.kind === "loop") {
    return {
      ...cloned,
      id: makeId(),
      body: cloned.body.map((element) => {
        if (element.kind === "branch") {
          return {
            ...element,
            id: makeId(),
            then: element.then.map((step) => ({ ...step, id: makeId() })),
            else: element.else.map((step) => ({ ...step, id: makeId() })),
          };
        }
        return { ...element, id: makeId() };
      }),
    };
  }
  if (cloned.kind === "branch") {
    return {
      ...cloned,
      id: makeId(),
      then: cloned.then.map((step) => ({ ...step, id: makeId() })),
      else: cloned.else.map((step) => ({ ...step, id: makeId() })),
    };
  }
  return { ...cloned, id: makeId() };
}`;
  if (!s.includes(old)) {
    console.error("scriptEdit.ts: old cloneWithFreshIds not found");
    process.exit(1);
  }
  s = s.replace(old, neu);
  s = s.replace(
    "return insertAt(program, cloneWithFreshIds(node, makeId), index + 1);",
    "return insertAt(program, cloneNodeWithFreshIds(node, makeId), index + 1);",
  );
  fs.writeFileSync(p, s);
  console.log("patched scriptEdit.ts");
}
