# losenergy.eu

The LosEnergy website: two static pages, served by GitHub Pages at https://losenergy.eu.

## What is here

| File | What it is |
| --- | --- |
| `index.html` | The home page: the proof, the scoreboard, the coverage map, how it works, what arrives each morning, the team, contact |
| `data/index.html` | The data page, at `/data/`: every registration, the receipts, the method, the coverage table, the delivery schema, the sources |
| `assets/site.css` | The styles both pages share |
| `assets/site.js` | The map's interaction and the receipt animation. The pages read fine without it |
| `assets/fonts/` | Archivo and Martian Mono, served from this site so no visitor data goes to a font CDN. Both under the SIL Open Font License (the `OFL-*.txt` files) |
| `404.html` | The page GitHub Pages shows for an address that does not exist |
| `favicon.svg`, `og.png` | The browser-tab icon and the image shown when the link is shared |
| `CNAME` | Tells GitHub Pages the site's domain: `losenergy.eu` |
| `robots.txt`, `sitemap.xml` | For search engines |
| `.nojekyll` | Tells GitHub Pages to publish the files as they are |

No build step, no tracking, no cookies, no third-party requests.

The map's country shapes are from Natural Earth (public domain).

## Preview on your own computer

Fonts do not load from a file opened by double-click, so serve the folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Keeping it true

Every number on the site comes from the ledger or a company's own report.
When a report is scored, update:

1. `index.html`, "Every call, in public": the PNE-style row for the new result, the tally line and its "As of" date.
2. `data/index.html`, "The record": the registration table (add the value of the estimate that was sealed), its "As of" date, and the seal-by calendar when a company announces its date.
3. The hero card on the home page, if the newest scored report should lead.

Never put a sealed estimate's number on the site before the company has reported.
