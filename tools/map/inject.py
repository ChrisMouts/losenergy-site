"""Puts map.svg.html and coverage.json (minified) into the home page.

    python3 inject.py                 # ../../index.html
    python3 inject.py path/to/index.html
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
site = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE.parent.parent / "index.html"
t = site.read_text(encoding="utf-8")
svg = (HERE / "map.svg.html").read_text(encoding="utf-8")
data = json.dumps(json.loads((HERE / "coverage.json").read_text(encoding="utf-8")), ensure_ascii=False,
                  separators=(",", ":"))
start = t.index('<svg viewBox="0 0 1000 860" role="group" aria-labelledby="map-title" class="rmap">')
end = t.index("</svg>", start) + len("</svg>")
t = t[:start] + svg + t[end:]
tag = '<script type="application/json" id="coverage-data">'
start = t.index(tag) + len(tag)
end = t.index("</script>", start)
t = t[:start] + data + t[end:]
site.write_text(t, encoding="utf-8")
print(f"wrote {site} ({len(t):,} characters)")
