# losenergy.eu

The LosEnergy website: two static pages, served by GitHub Pages at https://losenergy.eu.

## What is here

| File | What it is |
| --- | --- |
| `index.html` | The home page: the hero, the record timeline, the map of how closely we see each country, how it works, what arrives each morning, the team, contact |
| `data/index.html` | The data page, at `/data/`: every registration, the receipts, the method, coverage by country and by company, the delivery schema, the sources |
| `assets/site.css` | The styles both pages share |
| `assets/site.js` | The record timeline's and the map's interaction and reveal, the steps' drawing, the counting numbers, the receipt animation. The pages read fine without it |
| `assets/fonts/` | Archivo and Martian Mono, served from this site so no visitor data goes to a font CDN. Both under the SIL Open Font License (the `OFL-*.txt` files) |
| `404.html` | The page GitHub Pages shows for an address that does not exist |
| `favicon.svg`, `og.png` | The browser-tab icon and the image shown when the link is shared |
| `CNAME` | Tells GitHub Pages the site's domain: `losenergy.eu` |
| `robots.txt`, `sitemap.xml` | For search engines |
| `.nojekyll` | Tells GitHub Pages to publish the files as they are |

No build step and no cookies. One third-party request: Cloudflare Web Analytics, which counts visits without cookies (the snippet at the end of each page).

The map's country shapes are from Natural Earth (public domain). The map is static SVG written by `tools/map/` (see its README); run it again when what we read in a country changes.

## Preview on your own computer

Fonts do not load from a file opened by double-click, so serve the folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Keeping it true

Every number on the site comes from the ledger or a company's own report.
When a report is scored, update:

1. `tools/record/calls.json`: set the call's `"status": "scored"` with its figures (ours, theirs, the error and the two baselines), move `"as_of"`, and run `python3 tools/record/build_timeline.py`. It rewrites the timeline between `<!-- record:start -->` and `<!-- record:end -->` in `index.html`; the newest scored call is the one shown first.
2. `index.html`, the hero's "Calls on the public record" line, when the count of scored, sealed and to-seal calls changes.
3. `data/index.html`, "The record": the registration table (add the value of the estimate that was sealed), its "As of" date, and the seal-by calendar when a company announces its date.

Never put a sealed estimate's number on the site before the company has reported.

When what we read in a country changes (a new country read plant by plant, a new farm count), update `tools/map/coverage.json`, run the map tool, and update the matching lines on the data page ("Country by country", "Company by company") and step 3 of "How it works".

## What the site shows, and what it never shows

The site shows counts and totals: how many farms we read in a country, how often, what it feeds. It never shows single plants, their owners, or any person's name, and never data whose licence does not allow it to be shown. Plant-level data from Ireland's market operator and Denmark's energy agency is named only as counts until their terms are settled.
