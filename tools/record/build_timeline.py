"""Writes the home page's record timeline ("Sealed before they report") from calls.json.

    python3 tools/record/build_timeline.py            # ../../index.html
    python3 tools/record/build_timeline.py path/to/index.html

The timeline sits between <!-- record:start --> and <!-- record:end --> in index.html. When a company
reports, change its call in calls.json to "status": "scored" with the figures, move "as_of", and run this.
No third-party packages.
"""
import json
import sys
from datetime import date
from html import escape
from pathlib import Path

HERE = Path(__file__).resolve().parent
site = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE.parent.parent / "index.html"
cfg = json.loads((HERE / "calls.json").read_text(encoding="utf-8"))

D0, D1 = date.fromisoformat(cfg["from"]), date.fromisoformat(cfg["to"])
SPAN = (D1 - D0).days
AS_OF = date.fromisoformat(cfg["as_of"])


def x(d):
    """A date's position along the track, in percent."""
    return round(100 * (date.fromisoformat(d) - D0).days / SPAN, 2) if isinstance(d, str) else \
        round(100 * (d - D0).days / SPAN, 2)


def day(d, year=False):
    d = date.fromisoformat(d)
    return f"{d.day} {d.strftime('%b')}" + (f" {d.year}" if year else "")


def pct(v):
    return f"{v:+.1f}%".replace("-", "−")


def gwh(v):
    """1508.3 -> 1,508.3"""
    return f"{v:,.1f}"


# month ticks
ticks, d = [], D0
while d < D1:
    ticks.append(d)
    d = date(d.year + (d.month == 12), d.month % 12 + 1, 1)

axis = "".join(f'<span class="tl-m" style="--x:{x(t)}%">{t.strftime("%b")}</span>' for t in ticks)
lines = "".join(f'<i class="tl-mline" style="--x:{x(t)}%"></i>' for t in ticks[1:])
axis += f'<span class="tl-asof" style="--x:{x(AS_OF)}%">{day(cfg["as_of"])}</span>'
lines += f'<i class="tl-now" style="--x:{x(AS_OF)}%"></i>'

rows, details, i = [], [], 0
for g in cfg["groups"]:
    rows.append(f'<li class="tl-group">{escape(g["label"])}</li>')
    for c in g["calls"]:
        st = c.get("status", "to_seal")
        name = f'<span class="tl-name"><b>{escape(c["short"])}</b>' + \
               (f'<em>{escape(c["period"])}</em>' if c.get("period") else "") + "</span>"
        if st == "scored":
            a, b = x(c["sealed"]), x(c["reported"])
            ahead = (date.fromisoformat(c["reported"]) - date.fromisoformat(c["sealed"])).days
            track = (f'<i class="tl-bar" style="--a:{a}%;--b:{b}%"></i>'
                     f'<i class="tl-seal" style="--x:{a}%"></i><i class="tl-rep" style="--x:{b}%"></i>'
                     f'<span class="tl-lab" style="--x:{b}%">{ahead} days ahead</span>')
            res = f'<span class="tl-res ours">{pct(c["error_pct"])}</span>'
            sr = (f'{c["company"]}, {c["period_long"]}: sealed {day(c["sealed"], True)}, reported '
                  f'{day(c["reported"], True)}, {ahead} days later; our estimate {gwh(c["ours_gwh"])} GWh against '
                  f'{gwh(c["theirs_gwh"])} GWh, {pct(c["error_pct"])}.')
            details.append({
                "kind": "scored", "title": f'{c["company"]}, {c["period_long"]}',
                "sub": f'Sealed {day(c["sealed"], True)}, {c["sealed_time"]}. Reported {day(c["reported"], True)}, '
                       f'{ahead} days later.',
                "reported": c["reported"], "ours": gwh(c["ours_gwh"]), "theirs": gwh(c["theirs_gwh"]), "error": c["error_pct"],
                "normal": c["normal_pct"], "last": c["last_year_pct"], "note": c.get("note", "")})
        elif st == "sealed":
            a, b = x(c["sealed"]), x(AS_OF)
            track = (f'<i class="tl-bar open" style="--a:{a}%;--b:{b}%"></i>'
                     f'<i class="tl-tail" style="--a:{b}%"></i><i class="tl-seal" style="--x:{a}%"></i>'
                     f'<span class="tl-lab soft" style="--x:{round(b + 7, 2)}%">waiting for the report</span>')
            res = '<span class="tl-res chip">Sealed</span>'
            rev = c.get("revised")
            when = f'Sealed {day(c["sealed"], True)}' + (
                ", revised the same day" if rev == c["sealed"] else f", revised {day(rev)}" if rev else "")
            sr = f'{c["company"]}, {c["period_long"]}: {when.lower()}; waiting for the company’s report.'
            details.append({"kind": "sealed", "title": f'{c["company"]}, {c["period_long"]}', "sub": when + ".",
                            "body": f'Our figure goes up here, against {c["company"]}’s own, once it reports. '
                                    "Until then the estimate stays sealed."})
        else:
            a, b = x(g["seal_from"]), x(c["deadline"])
            track = (f'<i class="tl-dash" style="--a:{a}%;--b:{b}%"></i>'
                     f'<i class="tl-ring" style="--x:{a}%"></i><i class="tl-due" style="--x:{b}%"></i>')
            res = f'<span class="tl-res muted">by {day(c["deadline"])}</span>'
            sr = (f'{c["company"]}, full year 2026: sealed from {day(g["seal_from"], True)}, by '
                  f'{day(c["deadline"], True)} at the latest.')
            details.append({
                "kind": "to_seal", "title": f'{c["company"]}, full year 2026',
                "sub": f'Sealed from {day(g["seal_from"], True)}, when the year closes; by {day(c["deadline"], True)} '
                       "at the latest.",
                "body": ("PNE has announced its date." if c.get("announced") else
                         "The company has not announced its date: we set the deadline early, from its past "
                         "release dates.")})
        rows.append(f'<li><button type="button" class="tl-row s-{st.replace("_", "-")}" data-call="{i}" '
                    f'aria-pressed="false" style="--i:{i}">{name}<span class="tl-track" aria-hidden="true">{track}'
                    f'</span>{res}<span class="sr-only">{escape(sr)}</span></button></li>')
        i += 1


def detail_html(dd):
    if dd["kind"] == "scored":
        def bar(label, v, cls):
            if v is None:   # a benchmark that was not sealed for this call
                return (f'<div class="db-row"><span class="db-l">{label}</span><span class="db-t">'
                        f'<i class="db-zero"></i></span><span class="db-v">not sealed</span></div>')
            left, width = (50, 50 * v / 20) if v >= 0 else (50 + 50 * v / 20, -50 * v / 20)
            return (f'<div class="db-row"><span class="db-l">{label}</span><span class="db-t">'
                    f'<i class="db-zero"></i><i class="db-bar {cls}" style="left:{left:.2f}%;width:{width:.2f}%">'
                    f'</i></span><span class="db-v">{pct(v)}</span></div>')
        return (f'<p class="td-k">Latest result</p><h3>{escape(dd["title"])}</h3><p class="td-sub">{escape(dd["sub"])}</p>'
                f'<div class="td-big"><span class="td-err">{pct(dd["error"])}</span><span>{dd["ours"]} GWh sealed against '
                f'{dd["theirs"]} GWh reported.</span></div><p class="td-note">{escape(dd["note"])}</p>'
                f'<div class="db">{bar("Our estimate", dd["error"], "ours")}'
                f'{bar("Seasonal normal", dd["normal"], "base")}{bar("Same period last year", dd["last"], "base")}</div>')
    k = {"sealed": "Sealed, waiting for the report", "to_seal": "To be sealed"}[dd["kind"]]
    return (f'<p class="td-k">{k}</p><h3>{escape(dd["title"])}</h3><p class="td-sub">{escape(dd["sub"])}</p>'
            f'<p class="td-body">{escape(dd["body"])}</p>')


scored = [(dd["reported"], j) for j, dd in enumerate(details) if dd["kind"] == "scored"]
default = max(scored)[1] if scored else 0     # the newest scored call is shown first
for dd in details:
    dd["html"] = detail_html(dd)
block = f'''<!-- record:start -->
    <div class="tl-wrap" data-timeline>
      <div class="tl">
        <div class="tl-axis" aria-hidden="true">{axis}</div>
        <div class="tl-lane" aria-hidden="true">{lines}</div>
        <ol class="tl-list" aria-label="Calls on the public record">
          {"".join(rows)}
        </ol>
        <div class="tl-key" aria-hidden="true"><span><i class="k-seal"></i>Sealed by us</span><span><i class="k-rep"></i>Reported by the company</span><span><i class="k-due"></i>Report expected</span><span><i class="k-now"></i>As of {day(cfg["as_of"], True)}</span></div>
      </div>
      <div class="tl-detail" data-tl-detail data-default="{default}" aria-live="polite">{details[default]["html"]}</div>
    </div>
    <script type="application/json" id="record-data">{json.dumps([dd["html"] for dd in details], ensure_ascii=False)}</script>
    <!-- record:end -->'''
t = site.read_text(encoding="utf-8")
a, b = t.index("<!-- record:start -->"), t.index("<!-- record:end -->") + len("<!-- record:end -->")
site.write_text(t[:a] + block + t[b:], encoding="utf-8")
print(f"wrote the record timeline into {site}: {i} calls")
