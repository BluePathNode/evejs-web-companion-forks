const fs = require("fs");
const root = "C:/Users/Astap/Documents/Eve-Dev/evejs-web-companion-fork";
const changelogPath = root + "/CHANGELOG.md";
let changelog = fs.readFileSync(changelogPath, "utf8");
if (!changelog.includes("standing-fleet-boss")) {
  changelog = changelog.replace(
    "### Added\n\n",
    "### Added\n\n- **Fleet macro: standing-fleet-boss (Standing Fleet Boss)** — Bot Builder block that forms a fleet (extends Form a fleet), posts a fleet-finder advert with custom name/description, and keeps auto-accepting applicants by corporation, alliance, or standings greater than a threshold. Params: advertName, advertDescription, acceptBy (fleetAcceptBy), optional minStandings (standing). Sustained while the step runs. Helpers in web/src/nav/standingFleetBoss.ts. See docs/standing-fleet-boss.md.\n\n"
  );
  if (changelog.includes("### Known gaps")) {
    changelog = changelog.replace(
      "### Known gaps / not in this fork yet\n\n",
      "### Known gaps / not in this fork yet\n\n- Standing Fleet Boss / EveJS: public_minStanding is stored on the advert but isAdvertOpenToSession does not enforce it for INVITE_PUBLIC — standings mode is best-effort. RejectJoinRequest / UpdateAdvertAllowedEntities remain off the BFF surface.\n"
    );
  }
  fs.writeFileSync(changelogPath, changelog);
  console.log("changelog ok");
} else {
  console.log("changelog already");
}
