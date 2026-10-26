// tools/build-venue-map.js
// Run with: node tools/build-venue-map.js
// Writes venueLocations.js keyed by "City|State".

const fs = require("fs");

const LEAGUES = ["basketball/mens-college-basketball", "football/college-football"];
const SCORECARD_CSV = "Most-Recent-Cohorts-Institution.csv";
const OUT_FILE = "venueLocations.js";

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
  if (idx.name < 0 || idx.city < 0 || idx.lat < 0 || idx.lng < 0) {
    throw new Error("CSV missing expected columns (INSTNM, CITY, STABBR, LATITUDE, LONGITUDE)");
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const name = cols[idx.name]?.trim();
    const city = cols[idx.city]?.trim().toLowerCase();
    const lat = parseFloat(cols[idx.lat]);
    const lng = parseFloat(cols[idx.lng]);
    if (!name || !city || isNaN(lat) || isNaN(lng)) continue;
    rows.push({
      name,
      nameLower: name.toLowerCase(),
      city,
      state: (cols[idx.state] || "").trim().toUpperCase(),
      lat,
      lng,
    });
  }
  return rows;
}

// Match a venue's city+state to a Scorecard row.
function matchVenue(rows, city, state) {
  const cityLower = city.toLowerCase();
  const stateUpper = (state || "").toUpperCase();
  // Prefer exact city+state match
  let hit = rows.find((r) => r.city === cityLower && r.state === stateUpper);
  if (hit) return hit;
  // Fall back to city-only (works when state is missing/odd in ESPN data)
  hit = rows.find((r) => r.city === cityLower);
  return hit || null;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res.json();
}

async function main() {
  console.log("Loading Scorecard...");
  const rows = loadScorecard(SCORECARD_CSV);
  console.log(`Loaded ${rows.length} institutions.`);

  const venues = new Map(); // "City|State" -> { city, state, names: Set }
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 30); // last 30 days
  const end = new Date(today);
  end.setDate(end.getDate() + 60); // next 60 days

  const days = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    days.push(`${yyyy}${mm}${dd}`);
  }

  for (const league of LEAGUES) {
    console.log(`Fetching ${league}...`);
    const extra = league.includes("basketball") ? "&groups=50&limit=500" : "";
    for (const day of days) {
      const url = `https://site.api.espn.com/apis/site/v2/sports/${league}/scoreboard?dates=${day}${extra}`;
      let data;
      try {
        data = await fetchJson(url);
      } catch (e) {
        continue;
      }
      const events = data.events || [];
      for (const ev of events) {
        const venue = ev.competitions?.[0]?.venue;
        if (!venue?.address?.city) continue;
        const key = `${venue.address.city}|${venue.address.state || ""}`;
        if (!venues.has(key)) {
          venues.set(key, {
            city: venue.address.city,
            state: venue.address.state || "",
            names: new Set(),
          });
        }
        venues.get(key).names.add(venue.fullName || "?");
      }
    }
  }

  console.log(`Found ${venues.size} unique venue locations.`);

  const out = {};
  let missed = 0;
  for (const [key, v] of venues) {
    const row = matchVenue(rows, v.city, v.state);
    if (row) {
      out[key] = { lat: row.lat, lng: row.lng };
    } else {
      missed++;
      console.log(`  MISS: ${v.city}, ${v.state} (${[...v.names].join(", ")})`);
    }
  }

  fs.writeFileSync(OUT_FILE, "const venueLocations = " + JSON.stringify(out, null, 2) + ";");
  console.log(`\nWrote ${OUT_FILE} with ${Object.keys(out).length} venues (${missed} missed).`);
}

main().catch(console.error);