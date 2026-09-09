const fs = require("fs");
const path = "C:/Users/Astap/Documents/Eve-Dev/evejs-web-companion-fork/CHANGELOG.md";
let t = fs.readFileSync(path, "utf8");
if (!t.includes("standing-fleet-boss")) {
  const marker = "### Added\n\n- **Industrial macro: deploy-mtu-and-loot**";
  const markerCR = "### Added\r\n\r\n- **Industrial macro: deploy-mtu-and-loot**";
  const entry = "- **Fleet macro: standing-fleet-boss (Standing Fleet Boss)** — Bot Builder block that forms a fleet (extends Form a fleet), posts a fleet-finder advert with custom name/description, and keeps auto-accepting applicants by corporation, alliance, or standings greater than a threshold. Params: advertName, advertDescription, acceptBy (fleetAcceptBy), optional minStandings (standing). Sustained while the step runs. Helpers in web/src/nav/standingFleetBoss.ts. See docs/standing-fleet-boss.md.\n\n";
  if (t.includes(marker)) {
    t = t.replace(marker, "### Added\n\n" + entry + "- **Industrial macro: deploy-mtu-and-loot**");
  } else if (t.includes(markerCR)) {
    t = t.replace(markerCR, "### Added\r\n\r\n" + entry.replace(/\n/g, "\r\n") + "- **Industrial macro: deploy-mtu-and-loot**");
  } else {
    // fallback: insert after ### Added
    t = t.replace("### Added", "### Added\n\n" + entry.trimEnd());
  }
  if (!t.includes("public_minStanding is stored")) {
    t = t.replace(
      "### Known gaps / not in this fork yet\n\n",
      "### Known gaps / not in this fork yet\n\n- Standing Fleet Boss / EveJS: public_minStanding is stored on the advert but isAdvertOpenToSession does not enforce it for INVITE_PUBLIC — standings mode is best-effort. RejectJoinRequest / UpdateAdvertAllowedEntities remain off the BFF surface.\n"
    );
  }
  fs.writeFileSync(path, t);
}
console.log("has entry", t.includes("standing-fleet-boss"));
