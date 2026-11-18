// Builds the home page's "how closely we see each country" map as static SVG.
// Country shapes: Natural Earth 1:50m (public domain), via world-atlas.
// Reads coverage.json (each country's class: 4 each farm through the day, 3 each farm monthly,
// 2 each plant yearly, 1 the whole country daily). Writes map.svg.html next to this file;
// inject.py puts it, and coverage.json, into ../../index.html.
const fs = require("fs");
const pathMod = require("path");
const here = f => pathMod.join(__dirname, f);
const coverage = JSON.parse(fs.readFileSync(here("coverage.json"), "utf8"));
const d3 = require("d3-geo");
const topojson = require("topojson-client");
const simplify = require("topojson-simplify");
const raw = require("world-atlas/countries-50m.json");
// Simplify once, on the sphere: keeps coastlines readable at this size and the file small.
const world = simplify.simplify(simplify.presimplify(raw), 2e-3);

const W = 1000, H = 860;
const ISO = { // ISO 3166 numeric -> our code
  "826": "GB", "372": "IE", "056": "BE", "208": "DK", "276": "DE", "724": "ES", "620": "PT",
  "250": "FR", "380": "IT", "528": "NL", "616": "PL", "752": "SE", "246": "FI", "300": "GR", "348": "HU",
  "642": "RO", "792": "TR",
};
// resolution class: 4 each farm through the day, 3 each farm monthly, 2 each plant yearly, 1 country daily
const CLS = Object.fromEntries(Object.entries(coverage.countries).map(([code, c]) => [code, c.k]));
const GRID = { 4: 3.6, 3: 5.4, 2: 8, 1: 13 };       // dot spacing per class (px in the viewBox)
const RAD = { 4: 1.2, 3: 1.55, 2: 2.0, 1: 2.3 };   // dot radius per class

// Drop islands under about 80 km2: invisible at this size, and they make the file heavy.
const dropSmall = f => {
  if (f.geometry && f.geometry.type === "MultiPolygon") {
    const keep = f.geometry.coordinates.filter(poly =>
      d3.geoArea({ type: "Polygon", coordinates: poly }) > 2e-6);
    if (keep.length) f.geometry.coordinates = keep;
  }
  return f;
};
const all = topojson.feature(world, world.objects.countries).features.map(dropSmall);
const europe = all.filter(f => {
  const c = d3.geoCentroid(f);
  return c[0] > -30 && c[0] < 50 && c[1] > 30 && c[1] < 75;
});
// Fit to a fixed geographic frame (Portugal to western Türkiye, Crete to Lapland).
const frame = { type: "MultiPoint", coordinates: [[-10.2, 36.0], [33.5, 36.0], [-10.2, 70.2], [33.5, 70.2], [9, 35.3], [14, 70.9]] };
const projection = d3.geoConicConformal().parallels([40, 62]).rotate([-12, 0])
  .fitExtent([[18, 12], [W - 18, H - 12]], frame)
  .clipExtent([[-40, -40], [W + 40, H + 40]]);
const path = d3.geoPath(projection).digits(1);

const round = n => Math.round(n * 10) / 10;
const covered = europe.filter(f => ISO[String(f.id).padStart(3, "0")]);
const others = europe.filter(f => !ISO[String(f.id).padStart(3, "0")]);

// Label anchors: the projected centroid of each country's largest polygon (so France sits in France,
// not in the Atlantic between it and its overseas parts).
function mainland(f) {
  if (f.geometry.type !== "MultiPolygon") return f;
  let best = null, area = -1;
  for (const poly of f.geometry.coordinates) {
    const g = { type: "Feature", geometry: { type: "Polygon", coordinates: poly } };
    const a = d3.geoArea(g);
    if (a > area) { area = a; best = g; }
  }
  return best;
}
const NUDGE = { GB: [8, 34], SE: [-6, 40], FI: [0, 30], NO: [0, 0], IT: [-14, -40], GR: [-10, -8], TR: [-60, 0],
                DK: [-2, 2], NL: [-2, 2], PT: [0, 6], FR: [8, 6], DE: [0, 6], PL: [0, 4], IE: [0, 0], BE: [-1, 2],
                LU: [0, 0], HU: [0, 0], RO: [0, 0], ES: [6, 6] };

function spark(f, code, k, max, rng) {
  // grid-aligned points of the class pattern that fall inside the country, sampled
  const s = GRID[k], [[x0, y0], [x1, y1]] = path.bounds(f);
  const pts = [];
  for (let x = Math.floor(x0 / s) * s + s / 2; x <= x1; x += s) {
    for (let y = Math.floor(y0 / s) * s + s / 2; y <= y1; y += s) {
      if (x < 0 || y < 0 || x > W || y > H) continue;
      const ll = projection.invert([x, y]);
      if (ll && d3.geoContains(f, ll)) pts.push([round(x), round(y)]);
    }
  }
  const out = [];
  while (out.length < Math.min(max, pts.length)) {
    const i = Math.floor(rng() * pts.length);
    out.push(pts.splice(i, 1)[0]);
  }
  return out;
}
let seed = 7;
const rng = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

const NAMES = { GB: "the United Kingdom", IE: "Ireland", BE: "Belgium", DK: "Denmark", DE: "Germany",
  LU: "Luxembourg", ES: "Spain", PT: "Portugal", FR: "France", IT: "Italy", NL: "the Netherlands", PL: "Poland",
  SE: "Sweden", FI: "Finland", GR: "Greece", HU: "Hungary", RO: "Romania", TR: "Türkiye" };
const LABEL = { GB: "UK", IE: "IE", BE: "BE", DK: "DK", DE: "DE", LU: "", ES: "ES", PT: "PT", FR: "FR", IT: "IT",
  NL: "NL", PL: "PL", SE: "SE", FI: "FI", GR: "GR", HU: "HU", RO: "RO", TR: "TR" };
const ORDER = { 4: 0, 3: 1, 2: 2, 1: 3 };

let defs = "";
for (const k of [4, 3, 2, 1]) {
  const s = GRID[k];
  defs += `<pattern id="dots-${k}" width="${s}" height="${s}" patternUnits="userSpaceOnUse">` +
          `<circle class="pd pd${k}" cx="${s / 2}" cy="${s / 2}" r="${RAD[k]}"/></pattern>`;
}
defs += `<linearGradient id="fade-x" x1="0" x2="1" y1="0" y2="0"><stop offset="0.86" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>` +
        `<linearGradient id="fade-y" x1="0" x2="0" y1="0" y2="1"><stop offset="0.9" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>` +
        `<mask id="mask-x" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#fade-x)"/></mask>` +
        `<mask id="mask-y" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#fade-y)"/></mask>`;

let shapes = "", land = "", base = "", coarse = "", fine = "", hit = "", labels = "", sparks = "";
for (const f of others) {
  const [[x0, y0], [x1, y1]] = path.bounds(f);
  if (!(x1 > 0 && y1 > 0 && x0 < W && y0 < H)) continue;
  const d = path(f);
  if (d) land += `<path class="land" d="${d}"/>`;
}
const meta = {};
const byCode = {};
for (const f of covered) byCode[ISO[String(f.id).padStart(3, "0")]] = f;
const codes = Object.keys(CLS).sort((a, b) => CLS[b] - CLS[a] || a.localeCompare(b));
for (const code of codes) {
  const f = byCode[code];
  if (!f) { console.error("missing", code); continue; }
  const k = CLS[code], d = path(f);
  shapes += `<path id="c-${code}" d="${d}"/>`;
  base += `<use class="cb k${k}" data-country="${code}" href="#c-${code}"/>`;
  if (k > 1) coarse += `<use class="cc" data-country="${code}" href="#c-${code}"/>`;
  fine += `<use class="cf k${k}" data-country="${code}" href="#c-${code}"/>`;
  hit += `<use class="ct" data-country="${code}" data-k="${k}" tabindex="0" role="button" aria-pressed="false" aria-label="${NAMES[code]}" href="#c-${code}"/>`;
  const c = path.centroid(mainland(f)), n = NUDGE[code] || [0, 0];
  if (LABEL[code]) labels += `<text class="cl k${k}" data-country="${code}" x="${round(c[0] + n[0])}" y="${round(c[1] + n[1])}">${LABEL[code]}</text>`;
  if (k >= 3) {
    const pts = spark(f, code, k, { GB: 110, IE: 34, BE: 7, DK: 16 }[code], rng);
    for (const [x, y] of pts) {
      const dur = k === 4 ? (2.6 + rng() * 2.6) : (6.5 + rng() * 4);
      const del = rng() * dur;
      sparks += `<circle class="sp k${k}" data-country="${code}" cx="${x}" cy="${y}" r="${RAD[k] + 0.2}" style="--t:${dur.toFixed(2)}s;--d:-${del.toFixed(2)}s"/>`;
    }
    meta[code] = { sparks: pts.length };
  }
}
const svg =
`<svg viewBox="0 0 ${W} ${H}" role="group" aria-labelledby="map-title" class="rmap">
<title id="map-title">Map: how closely we read each country's plants</title>
<defs>${defs}${shapes}</defs>
<g mask="url(#mask-x)"><g mask="url(#mask-y)">
<g aria-hidden="true">${land}</g>
<g aria-hidden="true">${base}</g>
<g class="coarse" aria-hidden="true">${coarse}</g>
<g class="fine" aria-hidden="true">${fine}</g>
<g class="sparks" aria-hidden="true">${sparks}</g>
<g class="hits">${hit}</g>
</g></g>
<path class="c-outline" d=""/>
<g class="labels" aria-hidden="true">${labels}</g>
</svg>`;
fs.writeFileSync(here("map.svg.html"), svg);
console.log("bytes", svg.length, meta);
