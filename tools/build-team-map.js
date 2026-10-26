// tools/build-team-map.js
// Run with: node tools/build-team-map.js
// Requires: the College Scorecard CSV in the project root.
// No external API calls beyond ESPN (Node has no CORS restrictions).

const fs = require("fs");

// ---------- Config ----------
const CSV_FILE = "Most-Recent-Cohorts-Institution.csv"; // adjust to actual filename
const LEAGUES = [
  "basketball/mens-college-basketball",
  "football/college-football",
];

// ---------- CSV parser (handles quoted fields with commas) ----------
function parseCSVLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function loadScorecard(file) {
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = parseCSVLine(lines[0]);
  const idx = {
    name: header.indexOf("INSTNM"),
    city: header.indexOf("CITY"),
    state: header.indexOf("STABBR"),
    lat: header.indexOf("LATITUDE"),
    lng: header.indexOf("LONGITUDE"),
  };
  if (idx.name < 0 || idx.lat < 0 || idx.lng < 0) {
    throw new Error("CSV missing expected columns (INSTNM, LATITUDE, LONGITUDE)");
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const name = cols[idx.name]?.trim();
    const lat = parseFloat(cols[idx.lat]);
    const lng = parseFloat(cols[idx.lng]);
    if (!name || isNaN(lat) || isNaN(lng)) continue;
    rows.push({
      name,
      nameLower: name.toLowerCase(),
      city: (cols[idx.city] || "").toLowerCase(),
      state: cols[idx.state] || "",
      lat,
      lng,
    });
  }
  return rows;
}

// ---------- Manual aliases for tricky ESPN brand names ----------
const ALIASES = {
  "ole miss rebels": "university of mississippi",
  "nc state wolfpack": "north carolina state university",
  "app state mountaineers": "appalachian state university",
  "byu cougars": "brigham young university",
  "lsu tigers": "louisiana state university",
  "lsu new orleans privateers": "university of new orleans",
  "smu mustangs": "southern methodist university",
  "tcu horned frogs": "texas christian university",
  "ucf knights": "university of central florida",
  "uconn huskies": "university of connecticut",
  "umass minutemen": "university of massachusetts",
  "unlv rebels": "university of nevada las vegas",
  "usc trojans": "university of southern california",
  "ucla bruins": "university of california los angeles",
  "utep miners": "university of texas at el paso",
  "utsa roadrunners": "university of texas at san antonio",
  "vcu rams": "virginia commonwealth university",
  "vmi keydets": "virginia military institute",
  "uab blazers": "university of alabama at birmingham",
  "unc asheville bulldogs": "university of north carolina at asheville",
  "unc greensboro spartans": "university of north carolina at greensboro",
  "unc wilmington seahawks": "university of north carolina at wilmington",
  "charlotte 49ers": "university of north carolina at charlotte",
  "miami (oh) redhawks": "miami university",
  "miami hurricanes": "university of miami",
  "iu indianapolis jaguars": "indiana university purdue university indianapolis",
  "iu pennsylvania crimson hawks": "indiana university of pennsylvania",
  "southeast missouri state redhawks": "southeast missouri state university",
  "siu edwardsville cougars": "southern illinois university edwardsville",
  "ualbany great danes": "university at albany",
  "umbc retrievers": "university of maryland baltimore county",
  "umass lowell river hawks": "university of massachusetts lowell",
  "njit highlanders": "new jersey institute of technology",
  "ut martin skyhawks": "university of tennessee at martin",
  "ut arlington mavericks": "university of texas at arlington",
  "ut rio grande valley vaqueros": "university of texas rio grande valley",
  "texas a&m-corpus christi islanders": "texas a&m university corpus christi",
  "se louisiana lions": "southeastern louisiana university",
  "the citadel bulldogs": "the citadel",
  "william & mary tribe": "william & mary",
  "hawai'i rainbow warriors": "university of hawaii at manoas",
  "san josé state spartans": "san jose state university",
  "louisiana ragin' cajuns": "university of louisiana at lafayette",
  "southern miss golden eagles": "university of southern mississippi",
  "middle tennessee blue raiders": "middle tennessee state university",
  "kennesaw state owls": "kennesaw state university",
  "jacksonville state gamecocks": "jacksonville state university",
  "sam houston bearkats": "sam houston state university",
  "stephen f. austin lumberjacks": "stephen f austin state university",
  "saint joseph's hawks": "saint joseph's university",
  "saint mary's gaels": "saint mary's college of california",
  "saint peter's peacocks": "saint peter's university",
  "st. bonaventure bonnies": "st bonaventure university",
  "st. john's red storm": "st john's university new york",
  "st. thomas tommies": "university of st thomas",
  "mount st. mary's mountaineers": "mount st mary's university",
  "loyola chicago ramblers": "loyola university chicago",
  "loyola maryland greyhounds": "loyola university maryland",
  "loyola marymount lions": "loyola marymount university",
  "detroit mercy titans": "university of detroit mercy",
  "purdue fort wayne mastodons": "purdue university fort wayne",
  "fdu florham devils": "fairleigh dickinson university",
  "fairleigh dickinson knights": "fairleigh dickinson university",
  "long island university sharks": "long island university",
  "gardner-webb runnin' bulldogs": "gardner-webb university",
  "north carolina a&t aggies": "north carolina a&t state university",
  "texas a&m aggies": "texas a&m university",
  "texas a&m-commerce lions": "texas a&m university commerce",
  "prairie view a&m panthers": "prairie view a&m university",
  "alabama a&m bulldogs": "alabama a&m university",
  "arkansas-pine bluff golden lions": "university of arkansas at pine bluff",
  "mississippi valley state delta devils": "mississippi valley state university",
  "bethune-cookman wildcats": "bethune cookman university",
  "coppin state eagles": "coppin state university",
  "norfolk state spartans": "norfolk state university",
  "south carolina state bulldogs": "south carolina state university",
  "tennessee state tigers": "tennessee state university",
  "jackson state tigers": "jackson state university",
  "alabama state hornets": "alabama state university",
  "delaware state hornets": "delaware state university",
  "florida a&m rattlers": "florida a&m university",
  "grambling tigers": "grambling state university",
  "howard bison": "howard university",
  "morgan state bears": "morgan state university",
  "texas southern tigers": "texas southern university",
  "alcorn state braves": "alcorn state university",
  "southern jaguars": "southern university and a&m college",
  "arkansas state red wolves": "arkansas state university",
  "coastal carolina chanticleers": "coastal carolina university",
  "georgia southern eagles": "georgia southern university",
  "georgia state panthers": "georgia state university",
  "james madison dukes": "james madison university",
  "old dominion monarchs": "old dominion university",
  "south alabama jaguars": "university of south alabama",
  "texas state bobcats": "texas state university",
  "troy trojans": "troy university",
  "ul monroe warhawks": "university of louisiana at monroe",
  "western kentucky hilltoppers": "western kentucky university",
  "east carolina pirates": "east carolina university",
  "florida atlantic owls": "florida atlantic university",
  "florida international panthers": "florida international university",
  "south florida bulls": "university of south florida",
  "memphis tigers": "university of memphis",
  "tulane green wave": "tulane university",
  "wichita state shockers": "wichita state university",
  "temple owls": "temple university",
  "cincinnati bearcats": "university of cincinnati",
  "houston cougars": "university of houston",
  "byu cougars": "brigham young university",
  "army black knights": "united states military academy",
  "navy midshipmen": "united states naval academy",
  "hawai'i rainbow warriors": "university of hawaii at manoa",
  "ucla bruins": "university of california-los angeles",
  "uic flames": "university of illinois chicago",
  "umbc retrievers": "university of maryland-baltimore county",
  "umass lowell river hawks": "university of massachusetts-lowell",
  "unlv rebels": "university of nevada-las vegas",
  "clarion golden eagles": "clarion university of pennsylvania",
  "edinboro fighting scots": "edinboro university of pennsylvania",
  "umass dartmouth corsairs": "university of massachusetts dartmouth",
};

// ---------- Candidate tokens from ESPN displayName ----------
function candidateTokens(displayName) {
  // "Duke Blue Devils" -> ["duke blue", "duke"]
  // "North Carolina Tar Heels" -> ["north carolina tar", "north carolina"]
  const words = displayName.split(/\s+/);
  const tokens = [];
  for (let cut = words.length - 1; cut >= 1; cut--) {
    tokens.push(words.slice(0, cut).join(" ").toLowerCase());
  }
  return tokens;
}

function matchRow(rows, displayName) {
  const key = displayName.toLowerCase();

  // 1. Alias lookup
  if (ALIASES[key]) {
    const alias = ALIASES[key];
    const hit =
      rows.find((r) => r.nameLower === alias) ||
      rows.find((r) => r.nameLower.includes(alias));
    if (hit) return hit;
  }

  // 2. Token-based search (exact then substring)
  const tokens = candidateTokens(displayName);
  for (const token of tokens) {
    let hit = rows.find((r) => r.nameLower === token);
    if (hit) return hit;
    hit = rows.find((r) => r.nameLower.includes(token));
    if (hit) return hit;
  }

  // 3. Last resort: city-based match (original behavior)
  const cityToken = displayName.split(/\s+/)[0].toLowerCase();
  return rows.find((r) => r.city === cityToken) || null;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res.json();
}

async function main() {
  console.log("Loading College Scorecard CSV...");
  const scorecardRows = loadScorecard(CSV_FILE);
  console.log(`Loaded ${scorecardRows.length} institutions with coordinates.`);

  const out = {};
  const missed = [];
  const seenIds = new Set();

  for (const league of LEAGUES) {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${league}/teams?limit=500`;
    console.log(`Fetching ESPN teams: ${league}`);
    const data = await fetchJson(url);
    const teams = data.sports?.[0]?.leagues?.[0]?.teams || [];
    console.log(`  ${teams.length} teams`);

    for (const wrap of teams) {
      const t = wrap.team;
      if (!t?.id || !t?.displayName) continue;
      if (seenIds.has(t.id)) continue; // same team in both leagues (rare)
      seenIds.add(t.id);

      const row = matchRow(scorecardRows, t.displayName);
      if (row) {
        out[t.id] = { lat: row.lat, lng: row.lng };
      } else {
        missed.push(`${t.displayName} (location: ${t.location || "?"})`);
      }
    }
  }

  const output = "const teamLocations = " + JSON.stringify(out, null, 2) + ";";
  fs.writeFileSync("teamLocations.js", output);
  console.log(`\nWrote teamLocations.js with ${Object.keys(out).length} teams.`);

  if (missed.length > 0) {
    console.log(`\n${missed.length} teams not matched:`);
    missed.forEach((m) => console.log("  - " + m));
  }
}

main().catch(console.error);