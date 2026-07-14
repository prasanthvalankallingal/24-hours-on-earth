#!/usr/bin/env python3
"""
VizCon 2026 — "24 Hours on Earth" data pipeline.

Converts verified public CSVs (data-raw/) into clean static JSON (app-web/src/data/).
Pure stdlib — no pandas — so it runs anywhere.

Sources (all public, cited in the app):
  - Leisure minutes/day: OECD Time Use Database via Our World in Data (CC-BY)
  - Annual working hours: Our World in Data (CC-BY)
  - Unpaid care & domestic work: OWID (CC-BY)
  - Companionship by age (US): American Time Use Survey via OWID
"""

import csv
import json
import os

RAW = os.path.join(os.path.dirname(__file__), "..", "data-raw")
OUT = os.path.join(os.path.dirname(__file__), "..", "app-web", "src", "data")
os.makedirs(OUT, exist_ok=True)

# Working days/year assumption for annual->daily conversion (documented in app).
WORK_DAYS_PER_YEAR = 250


def read_csv(name):
    with open(os.path.join(RAW, name), newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def build_timeuse():
    """Per-country daily picture: measured leisure + derived work.
    Honest model: leisure is measured (min/day); work is derived from annual
    hours; 'sleep & personal' is the remainder of the 24h day. No fabricated
    per-country sleep figures — the remainder is labelled transparently.
    """
    leisure = read_csv("leisure.csv")

    # Latest annual working hours per country code.
    wh_latest = {}
    for r in read_csv("working_hours.csv"):
        code, yr, val = r.get("Code"), num(r.get("Year")), num(r.get("Working hours per worker"))
        if code and yr and val is not None:
            if code not in wh_latest or yr > wh_latest[code]["year"]:
                wh_latest[code] = {"year": int(yr), "hours": val}

    countries = []
    for r in leisure:
        code = r.get("Code")
        if not code:
            continue
        lw = num(r.get("Women's leisure time"))  # minutes/day
        lm = num(r.get("Men's leisure time"))
        leisure_both = None
        if lw is not None and lm is not None:
            leisure_both = round((lw + lm) / 2)

        work_min = None
        if code in wh_latest:
            work_min = round(wh_latest[code]["hours"] / WORK_DAYS_PER_YEAR * 60)

        countries.append({
            "country": r.get("Entity"),
            "code": code,
            "region": r.get("World region according to OWID"),
            "population": int(num(r.get("Population")) or 0),
            "leisureWomenMin": lw,
            "leisureMenMin": lm,
            "leisureMin": leisure_both,
            "workMin": work_min,
            "workYear": wh_latest.get(code, {}).get("year"),
        })

    countries.sort(key=lambda c: c["country"])
    return countries


def build_working_hours_broad():
    """Latest daily work minutes for the broad ~130-country recolor layer."""
    wh = {}
    for r in read_csv("working_hours.csv"):
        code, yr, val = r.get("Code"), num(r.get("Year")), num(r.get("Working hours per worker"))
        if code and yr and val is not None:
            if code not in wh or yr > wh[code]["year"]:
                wh[code] = {
                    "country": r.get("Entity"),
                    "code": code,
                    "year": int(yr),
                    "workMin": round(val / WORK_DAYS_PER_YEAR * 60),
                }
    return sorted(wh.values(), key=lambda c: c["country"])


def build_companionship():
    """US: hours/day spent with each relationship type, by age."""
    out = {"All people": [], "Men": [], "Women": []}
    for r in read_csv("companionship_us.csv"):
        ent = r.get("Entity")
        if ent not in out:
            continue
        out[ent].append({
            "age": int(num(r.get("Year"))),
            "alone": num(r.get("Alone")),
            "friends": num(r.get("With friends")),
            "children": num(r.get("With children")),
            "family": num(r.get("With family")),
            "partner": num(r.get("With partner")),
            "coworkers": num(r.get("With coworkers")),
        })
    for k in out:
        out[k].sort(key=lambda d: d["age"])
    return out


def build_unpaid():
    rows = []
    for r in read_csv("unpaid_work.csv"):
        if not r.get("Code"):
            continue
        rows.append({
            "country": r.get("Entity"),
            "code": r.get("Code"),
            "year": int(num(r.get("Year")) or 0),
            "ruralWomen": num(r.get("Rural women")),
            "urbanWomen": num(r.get("Urban women")),
            "urbanMen": num(r.get("Urban men")),
            "ruralMen": num(r.get("Rural men")),
        })
    return sorted(rows, key=lambda c: c["country"])


# ── Global metrics (OWID, ~180-250 countries) ─────────────────────────────
# Each: (filename, value column, output key[, transform]). Latest year/country.
# Optional transform converts source units → the unit we display.
KG_PER_YEAR_TO_G_PER_DAY = lambda v: v / 365 * 1000  # noqa: E731
GLOBAL_METRICS = [
    ("metric_happiness.csv", "Self-reported life satisfaction", "happiness"),
    ("metric_birth.csv", "Birth rate", "birthRate"),
    ("metric_death.csv", "Annual crude death rate", "deathRate"),
    ("metric_life_exp.csv", "Life expectancy", "lifeExpectancy"),
    ("metric_fertility.csv", "Fertility rate", "fertility"),
    ("metric_internet.csv", "Share of the population using the Internet", "internet"),
    # What the world eats in an average day (OWID/FAO, ~192 countries)
    ("food_calories.csv", "Daily calorie supply per person", "calories"),
    ("food_meat.csv", "Daily per capita consumption of meat", "meat"),
    # vegetable supply is kg/yr → convert to g/day for "in a day" consistency
    ("food_vegetables.csv", "Vegetable supply per person", "vegetables", KG_PER_YEAR_TO_G_PER_DAY),
    # commute: Eurostat one-way minutes → round-trip minutes/day (EU-only, ~28)
    ("commute_eu.csv", "Commute one-way min", "commute", lambda v: v * 2),
]


def latest_by_code(fname, col):
    """Most-recent value per ISO3 country code from an OWID CSV."""
    latest: dict[str, dict] = {}
    for r in read_csv(fname):
        code, yr, val = r.get("Code"), num(r.get("Year")), num(r.get(col))
        if not code or len(code) != 3 or val is None or yr is None:
            continue
        if code not in latest or yr > latest[code]["year"]:
            latest[code] = {"year": int(yr), "value": val, "country": r.get("Entity")}
    return latest


def build_metrics():
    """Merge all global metrics into one code-keyed record per country, and
    derive daily human counts (births/deaths per day) so every headline metric
    can be expressed in the context of a single 24-hour day."""
    by_code: dict[str, dict] = {}
    for spec in GLOBAL_METRICS:
        fname, col, key = spec[0], spec[1], spec[2]
        transform = spec[3] if len(spec) > 3 else None
        for code, rec in latest_by_code(fname, col).items():
            slot = by_code.setdefault(code, {"code": code, "country": rec["country"]})
            val = transform(rec["value"]) if transform else rec["value"]
            slot[key] = round(val, 2)
            slot[f"{key}Year"] = rec["year"]

    # Population → derive daily births & deaths (rate is per 1,000 per year).
    pop = latest_by_code("metric_population.csv", "Population")
    for code, slot in by_code.items():
        p = pop.get(code)
        if p:
            slot["population"] = int(p["value"])
            if "birthRate" in slot:
                slot["dailyBirths"] = round(slot["birthRate"] / 1000 * p["value"] / 365)
            if "deathRate" in slot:
                slot["dailyDeaths"] = round(slot["deathRate"] / 1000 * p["value"] / 365)

    return sorted(by_code.values(), key=lambda c: c["country"])


def build_cities(top_n=1200):
    """Top-N cities by population from GeoNames cities15000 (public domain).
    Fields (tab-separated): 0 id,1 name,2 asciiname,...,4 lat,5 lng,...,8 country,14 population."""
    path = os.path.join(RAW, "cities15000.txt")
    rows = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            p = line.split("\t")
            if len(p) < 15:
                continue
            pop = int(p[14]) if p[14].isdigit() else 0
            rows.append({
                "name": p[1],
                "lat": round(float(p[4]), 3),
                "lng": round(float(p[5]), 3),
                "country": p[8],
                "pop": pop,
            })
    rows.sort(key=lambda c: c["pop"], reverse=True)
    return rows[:top_n]


def write(name, data):
    path = os.path.join(OUT, name)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  wrote {name}: {len(data) if isinstance(data, list) else len(json.dumps(data))} "
          f"{'rows' if isinstance(data, list) else 'chars'}")


def main():
    print("Building VizCon data ->", os.path.relpath(OUT))
    write("timeuse.json", build_timeuse())
    write("working_hours.json", build_working_hours_broad())
    write("companionship_us.json", build_companionship())
    write("unpaid_work.json", build_unpaid())
    write("metrics.json", build_metrics())
    write("cities.json", build_cities())
    print("Done.")


if __name__ == "__main__":
    main()
