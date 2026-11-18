# The home page map

`index.html`'s map, "How closely we see each country", is static SVG written by this tool. A visitor's browser loads nothing from here.

Each country gets a dot grid as fine as the data we read there (`coverage.json`, `k`):

| k | We read | Countries today |
| --- | --- | --- |
| 4 | each farm, through the day | United Kingdom, Ireland, Belgium |
| 3 | each farm, every month | Denmark |
| 2 | each plant, once a year | Germany |
| 1 | the whole country, every day | the twelve other countries with a company's plants |

## Run it

```bash
cd tools/map
npm install
node gen_map.js      # writes map.svg.html
python3 inject.py    # puts it and coverage.json into ../../index.html
```

Then look at the page (`python3 -m http.server 8000` from the site folder) before committing.

## When to run it

When a country's class changes, when a company's countries change, or when a count in `coverage.json` changes. Keep the data page's "Country by country" and "Company by company" tables, and step 3 of "How it works", in step with it.

Country shapes: Natural Earth 1:50m (public domain), via the `world-atlas` package. The twinkling dots sit on the country's own dot grid, chosen at random: they are decoration, never plant locations.
