const fs = require("fs");

// StationPicker: composite keys + dedupe results
{
  const p = "web/src/ui/StationPicker.svelte";
  let s = fs.readFileSync(p, "utf8");
  const oldSearch = `      results = await flow.searchDestinations(q, allowSystems ? null : "station");
      if (results.length === 0) {`;
  const newSearch = `      const found = await flow.searchDestinations(q, allowSystems ? null : "station");
      // Kind+id — same numeric id can be a system and a station; Travel already
      // keys that way. Also drop wire duplicates so keyed {#each} cannot throw.
      const seen = new Set<string>();
      results = found.filter((match) => {
        const key = \`\${match.kind}:\${match.id}\`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (results.length === 0) {`;
  if (!s.includes(oldSearch)) {
    console.error("StationPicker search assign not found");
    process.exit(1);
  }
  s = s.replace(oldSearch, newSearch);
  s = s.replace(
    `{#each results.slice(0, 8) as match (match.id)}`,
    `{#each results.slice(0, 8) as match (\`\${match.kind}:\${match.id}\`)}`,
  );
  fs.writeFileSync(p, s);
  console.log("patched StationPicker");
}

// MiningBot: dedupe stations (and belts) by id after building
{
  const p = "web/src/ui/MiningBot.svelte";
  let s = fs.readFileSync(p, "utf8");
  const oldStationsEnd = `      rows.push({ id: flightHomeID, label, distance: "where you docked" });
    }
    return rows;
  });`;
  const newStationsEnd = `      rows.push({ id: flightHomeID, label, distance: "where you docked" });
    }
    // Defensive: entity itemIDs, StationStatic, and flight stationID/structureID
    // can overlap after the Upwell change — keyed {#each stations (choice.id)}
    // throws each_key_duplicate if two rows share an id.
    const seen = new Set<number>();
    return rows.filter((row) => (seen.has(row.id) ? false : (seen.add(row.id), true)));
  });`;
  if (!s.includes(oldStationsEnd)) {
    console.error("MiningBot stations end not found");
    process.exit(1);
  }
  s = s.replace(oldStationsEnd, newStationsEnd);

  const oldBeltsReturn = `    if (rows.length > 0) {
      return rows.sort((a, b) => a.label.localeCompare(b.label));
    }`;
  const newBeltsReturn = `    if (rows.length > 0) {
      const seen = new Set<number>();
      return rows
        .filter((row) => (seen.has(row.id) ? false : (seen.add(row.id), true)))
        .sort((a, b) => a.label.localeCompare(b.label));
    }`;
  if (s.includes(oldBeltsReturn)) {
    s = s.replace(oldBeltsReturn, newBeltsReturn);
    console.log("patched MiningBot belts dedupe");
  }
  fs.writeFileSync(p, s);
  console.log("patched MiningBot stations");
}
