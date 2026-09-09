const fs = require("fs");

// runPolicy
{
  const path = "C:/Users/Astap/Documents/Eve-Dev/evejs-web-companion-fork/web/src/bots/runPolicy.ts";
  let t = fs.readFileSync(path, "utf8");
  if (!t.includes('"standing-fleet-boss"')) {
    t = t.replace(
      '"join-fleet": policy(["fleet"]),\r\n  "attack-player":',
      '"join-fleet": policy(["fleet"]),\r\n  "standing-fleet-boss": policy(["fleet"]),\r\n  "attack-player":'
    );
    if (!t.includes('"standing-fleet-boss"')) {
      t = t.replace(
        '"join-fleet": policy(["fleet"]),\n  "attack-player":',
        '"join-fleet": policy(["fleet"]),\n  "standing-fleet-boss": policy(["fleet"]),\n  "attack-player":'
      );
    }
    fs.writeFileSync(path, t);
  }
  console.log("runPolicy", t.includes('"standing-fleet-boss"'));
}

// advertData cast in scriptMacros
{
  const path = "C:/Users/Astap/Documents/Eve-Dev/evejs-web-companion-fork/web/src/nav/scriptMacros.ts";
  let t = fs.readFileSync(path, "utf8");
  const from = "{ kind: \"postFleetAdvert\", advertData },";
  const to = "{ kind: \"postFleetAdvert\", advertData: advertData as Readonly<Record<string, unknown>> },";
  if (t.includes(from) && !t.includes(to)) {
    t = t.replace(from, to);
    fs.writeFileSync(path, t);
    console.log("cast ok");
  } else {
    console.log("cast state", t.includes(to));
  }
}

// fix macro tests board arg
{
  const path = "C:/Users/Astap/Documents/Eve-Dev/evejs-web-companion-fork/web/src/nav/standingFleetBoss.macro.test.ts";
  let t = fs.readFileSync(path, "utf8");
  t = t.replaceAll(",\n    {},\n  );", ",\n    {},\n    {},\n  );");
  // also CRLF
  t = t.replaceAll(",\r\n    {},\r\n  );", ",\r\n    {},\r\n    {},\r\n  );");
  fs.writeFileSync(path, t);
  console.log("tests board fixed");
}
