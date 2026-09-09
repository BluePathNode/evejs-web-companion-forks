const fs = require("fs");
const p = "web/src/ui/BotBuilder.svelte";
let s = fs.readFileSync(p, "utf8");

// 1) Import cloneNodeWithFreshIds and dockedLocationID
if (!s.includes("cloneNodeWithFreshIds")) {
  if (s.includes('from "../bots/scriptEdit.ts"')) {
    s = s.replace(
      /import \{([^}]*)\} from "\.\.\/bots\/scriptEdit\.ts";/,
      (m, inner) => `import {${inner}, cloneNodeWithFreshIds } from "../bots/scriptEdit.ts";`.replace(", ,", ",")
    );
  } else {
    // find a bots import block to insert after
    s = s.replace(
      'import { EXAMPLE_BOTS, type ExampleBot } from "../bots/exampleBots.ts";',
      'import { EXAMPLE_BOTS, type ExampleBot } from "../bots/exampleBots.ts";\n  import { cloneNodeWithFreshIds } from "../bots/scriptEdit.ts";'
    );
  }
}
if (!s.includes("dockedLocationID")) {
  s = s.replace(
    'import { cloneNodeWithFreshIds } from "../bots/scriptEdit.ts";',
    'import { cloneNodeWithFreshIds } from "../bots/scriptEdit.ts";\n  import { dockedLocationID } from "../bridge/flight.ts";'
  );
}

// 2) Fix duplicateStep
const oldDup = `  function duplicateStep(i: number): void {
    const s = steps[i];
    if (s === undefined) return;
    const clone = { ...structuredClone($state.snapshot(s) as EditorNode), id: makeId() } as EditorNode;
    steps = [...steps.slice(0, i + 1), clone, ...steps.slice(i + 1)];
  }`;
const newDup = `  function duplicateStep(i: number): void {
    const s = steps[i];
    if (s === undefined) return;
    // Deep fresh ids (branch then/else included) — a top-level-only re-id leaves
    // nested handles shared with the original and keyed {#each} throws.
    const clone = cloneNodeWithFreshIds($state.snapshot(s) as EditorNode, makeId) as EditorNode;
    steps = [...steps.slice(0, i + 1), clone, ...steps.slice(i + 1)];
  }`;
if (!s.includes(oldDup)) {
  console.error("duplicateStep block not found exact");
  // try looser
  if (!s.includes("structuredClone($state.snapshot(s)")) {
    console.error("no structuredClone duplicate either");
    process.exit(1);
  }
}
s = s.replace(oldDup, newDup);

// 3) Fix stations / currentStation for Upwell
const oldStations = `  const stations = $derived.by<{ id: number; name: string }[]>(() => {
    const out: { id: number; name: string }[] = [];
    const st = $flight.status;
    if (st !== null && st.docked && st.stationID !== null) {
      out.push({ id: st.stationID, name: $flight.stationName ?? "This station" });
    }
    return out;
  });`;
const newStations = `  const stations = $derived.by<{ id: number; name: string }[]>(() => {
    const out: { id: number; name: string }[] = [];
    const st = $flight.status;
    if (st !== null && st.docked) {
      const id = dockedLocationID(st);
      if (id !== null && id > 0) {
        out.push({
          id,
          name: $flight.stationName ?? $flight.structureName ?? "This station",
        });
      }
    }
    return out;
  });`;
if (s.includes(oldStations)) {
  s = s.replace(oldStations, newStations);
  console.log("patched stations derived");
} else {
  console.warn("stations derived not found exact — check manually");
}

// 4) Dedup beltsOnGrid
const oldBelts = `  const beltsOnGrid = $derived(
    ($space.snapshot?.entities ?? [])
      .filter((e) => /belt/i.test(e.name ?? ""))
      .map((e) => ({ itemID: e.itemID, name: e.name ?? "Unnamed belt" })),
  );`;
const newBelts = `  const beltsOnGrid = $derived.by(() => {
    const seen = new Set<number>();
    const rows: { itemID: number; name: string }[] = [];
    for (const e of $space.snapshot?.entities ?? []) {
      if (!/belt/i.test(e.name ?? "") || seen.has(e.itemID)) continue;
      seen.add(e.itemID);
      rows.push({ itemID: e.itemID, name: e.name ?? "Unnamed belt" });
    }
    return rows;
  });`;
if (s.includes(oldBelts)) {
  s = s.replace(oldBelts, newBelts);
  console.log("patched beltsOnGrid");
} else {
  console.warn("beltsOnGrid not found exact");
}

// 5) Dedup fittings / bookmarks / pilots on load
s = s.replace(
  `knownPilots = loadKnownCharacters().map((k) => ({ characterID: k.characterID, characterName: k.characterName }));`,
  `const seenPilots = new Set<number>();
    knownPilots = loadKnownCharacters()
      .map((k) => ({ characterID: k.characterID, characterName: k.characterName }))
      .filter((p) => (seenPilots.has(p.characterID) ? false : (seenPilots.add(p.characterID), true)));`
);

s = s.replace(
  `savedFittings = rows.map((f) => ({ fittingID: f.fittingID, name: f.name }));`,
  `const seenFit = new Set<number>();
        savedFittings = rows
          .map((f) => ({ fittingID: f.fittingID, name: f.name }))
          .filter((f) => (seenFit.has(f.fittingID) ? false : (seenFit.add(f.fittingID), true)));`
);

s = s.replace(
  `savedSpots = rows;`,
  `const seenBm = new Set<number>();
        savedSpots = rows.filter((bm) =>
          seenBm.has(bm.bookmarkID) ? false : (seenBm.add(bm.bookmarkID), true),
        );`
);

// 6) loadFrom: bump idSeed from existing ids, then uniquify if needed
const oldLoadEnd = `    idSeed += 1000;
  }`;
const newLoadEnd = `    bumpIdSeedFromDoc(doc);
    uniquifyEditorIds();
  }

  /** Keep makeId() from minting an id the loaded document already uses. */
  function bumpIdSeedFromDoc(doc: BotScript): void {
    const consider = (id: string): void => {
      const m = /^n(\\d+)$/.exec(id);
      if (m) idSeed = Math.max(idSeed, Number(m[1]));
    };
    for (const row of doc.interrupts) consider(row.id);
    const walk = (node: ProgramNode): void => {
      consider(node.id);
      if (node.kind === "loop") node.body.forEach(walk);
      else if (node.kind === "branch") {
        node.then.forEach(walk);
        node.else.forEach(walk);
      }
    };
    doc.program.forEach(walk);
    // Still jump ahead so a fresh edit session after a short doc stays clear of
    // any hand-minted n* ids that were not scanned (e.g. inside advanced shapes).
    idSeed += 100;
  }

  /**
   * Last line of defence for keyed {#each} rows: if a loaded/edited document
   * somehow still shares a handle between two watches or two sibling steps,
   * reassign before the next render can throw each_key_duplicate.
   */
  function uniquifyEditorIds(): void {
    const used = new Set<string>();
    const take = (id: string): string => {
      const trimmed = id.trim();
      if (trimmed.length > 0 && !used.has(trimmed)) {
        used.add(trimmed);
        return trimmed;
      }
      const fresh = makeId();
      used.add(fresh);
      return fresh;
    };
    watches = watches.map((w) => ({ ...w, id: take(w.id) }));
    const fix = (node: EditorNode): EditorNode => {
      if (node.kind === "branch") {
        return {
          ...node,
          id: take(node.id),
          then: node.then.map((step) => ({ ...step, id: take(step.id) })),
          else: node.else.map((step) => ({ ...step, id: take(step.id) })),
        };
      }
      return { ...node, id: take(node.id) };
    };
    steps = steps.map(fix);
  }`;

if (s.includes("uniquifyEditorIds")) {
  console.log("uniquify already present");
} else if (s.includes(oldLoadEnd)) {
  // Only replace the loadFrom ending — be careful there may be multiple idSeed += 1000
  const idx = s.indexOf("function loadFrom(doc: BotScript): void");
  if (idx < 0) {
    console.error("loadFrom not found");
    process.exit(1);
  }
  const endIdx = s.indexOf("    idSeed += 1000;\n  }", idx);
  if (endIdx < 0) {
    console.error("idSeed bump in loadFrom not found");
    process.exit(1);
  }
  s = s.slice(0, endIdx) + newLoadEnd + s.slice(endIdx + oldLoadEnd.length);
  console.log("patched loadFrom id handling");
} else {
  console.error("could not patch loadFrom");
  process.exit(1);
}

// Need ProgramNode in scope for bumpIdSeedFromDoc — check imports from botScript
if (!s.includes("type ProgramNode") && !s.includes("ProgramNode,")) {
  // try to add to existing botScript import
  const re = /import \{([\s\S]*?)\} from "\.\.\/bots\/botScript\.ts";/;
  const m = s.match(re);
  if (m && !m[1].includes("ProgramNode")) {
    s = s.replace(re, (full, inner) => {
      const trimmed = inner.trim().replace(/,$/, "");
      return `import {\n  ${trimmed},\n  type ProgramNode,\n} from "../bots/botScript.ts";`;
    });
    console.log("added ProgramNode import");
  }
}

fs.writeFileSync(p, s);
console.log("wrote BotBuilder.svelte");
