"""Build public/radar.json and public/logos/ from the job radar repo (../agents).

Everything shown in the dashboard comes from the radar's own database, digests,
profile, company list and README changelog. Lessons and tests are written in
plain words here, but every number in them is copied from the README, and the
source line is kept next to it.

    python3 scripts/export.py
"""

from __future__ import annotations

import json
import os
import re
import shutil
import sqlite3
import tomllib
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
# The radar checkout. CI points this at its own workspace (see the radar's job-radar.yml).
AGENTS = Path(os.environ.get("AGENTS_DIR") or ROOT.parent / "agents")
OUT = ROOT / "public" / "radar.json"
LOGOS_OUT = ROOT / "public" / "logos"

# ── Practice: each version as a lesson (numbers from README "Changelog") ──────
LESSONS = [
    dict(v="v0.1", problem="A London job passed as US remote. A recruiter role scored 5 for saying “GTM”.",
         fix="“Remote” must name a US place. Recruiting, legal and sales roles are screened out.", result="850 → 630 let through", passed=630),
    dict(v="v0.2", problem="Most of the 630 asked for 3+ years, and each would cost a Claude call.",
         fix="Code reads “N+ years” from the posting for free and drops them.", result="630 → 209 let through", passed=209),
    dict(v="v0.3", problem="Contract roles and roles paying under $100k got through.",
         fix="Full-time only. Pay converted to yearly USD, $100k floor.", result="79% of kept roles show pay"),
    dict(v="v0.4", problem="No place to act on what it found.",
         fix="A tracker: Review, Pipeline, Archive.", result="You decide every application"),
    dict(v="v0.5", problem="Removing a role taught it nothing.",
         fix="Each removal can carry a reason that points at the rule to change.", result="Caught 3 bad suggestions in testing"),
    dict(v="v0.6", problem="New roles were buried under old ones.",
         fix="A New section for the last 4 days.", result="Auto-apply ruled out"),
    dict(v="v0.7", problem="Opus costs 39× more per role than Haiku.",
         fix="Both scored the same 20 roles.", result="Kept Opus"),
    dict(v="v0.8", problem="Keyword rules rated dozens of roles a 5.",
         fix="Claude re-read the top 60, quoting the posting as proof.", result="12 rated 4 or 5, $0.83"),
    dict(v="v0.9", problem="No way to know which jobs it never saw.",
         fix="Log roles you find yourself; each is matched against everything it saw.", result="Not run yet"),
]

FIRST_LAP = {"v": "v0", "passed": 850}

# ── The test (numbers from README v0.7 and digests/compare-2026-10-20.md) ────
MODEL_CHECK = {
    "postings": 20, "sameCall": 18, "exact": 9, "withinOne": 19,
    "opusPerPosting": 0.0140, "haikuPerPosting": 0.00036, "cheaper": 39,
    "misses": [
        {"company": "Databricks", "title": "Associate Product Manager, New Grad (2027 Start)", "opus": 5, "haiku": 3},
        {"company": "Databricks", "title": "Product Design New Grad (2027 Start)", "opus": 4, "haiku": 3},
    ],
    "monthlyDifference": "about $1",
}

FILTER_PLAIN = {
    "title": "Title isn't a target role, or is senior, lead or intern",
    "location": "Outside the US",
    "experience": "Asks for 3+ years",
    "type": "Not full-time",
    "pay": "Pay tops out under $100k",
}


def section(md: str, heading: str) -> list[str]:
    m = re.search(rf"^## {re.escape(heading)}\n(.*?)(?=^## |\Z)", md, re.S | re.M)
    if not m:
        return []
    items = []
    for line in m.group(1).splitlines():
        line = re.sub(r"^\s*(?:[-*]|\d+\.)\s+", "", line).strip()
        if line:
            items.append(re.sub(r"\*\*", "", line))
    return items


def logos() -> dict:
    src = AGENTS / "jobs" / "logos"
    LOGOS_OUT.mkdir(parents=True, exist_ok=True)
    index = json.loads((src / "index.json").read_text())
    out = {}
    for company, name in index.items():
        shutil.copy(src / name, LOGOS_OUT / name)
        raw = (src / name).read_bytes()[:32]
        width = int.from_bytes(raw[16:20], "big") if raw[:8] == b"\x89PNG\r\n\x1a\n" else 0
        out[company] = {"file": name, "small": width < 96}
    return out


def compare_digest() -> dict:
    text = (AGENTS / "digests" / "compare-2026-10-20.md").read_text()
    rows = []
    for m in re.finditer(r"^\| (\d) \| (\d) \| ([+-]\d) \| \[(.+?)\]\((.+?)\) \| (.+?) \| (.+?) \|$", text, re.M):
        kw, llm, delta, title, url, company, gap = m.groups()
        rows.append({"kw": int(kw), "llm": int(llm), "delta": int(delta), "title": title, "url": url,
                     "company": company, "gap": gap.replace(" ⚠ ungrounded", ""), "ungrounded": "ungrounded" in gap})
    shift = {int(k): v for k, v in re.findall(r"([+-]?\d+): (\d+)", re.search(r"score shift.*?\{(.*?)\}", text).group(1))}
    tokens = re.search(r"tokens: ([\d,]+) in / ([\d,]+) out", text).groups()
    return {"rows": rows, "shift": {k: int(v) for k, v in shift.items()},
            "scored": 60, "exact": 20, "withinOne": 47, "grounded": 58,
            "tokensIn": int(tokens[0].replace(",", "")), "tokensOut": int(tokens[1].replace(",", "")),
            "model": "claude-opus-5-5", "cost": 0.83}


def example(conn) -> dict:
    """What Claude actually reads for the example role, using the radar's own compressor."""
    import sys
    sys.path.insert(0, str(AGENTS))
    from jobs.score import compress
    row = conn.execute("select description from jobs where company = 'Clay' and title = 'Software Engineer, Applied AI'").fetchone()
    text = row["description"] or ""
    return {"company": "Clay", "title": "Software Engineer, Applied AI", "chars": len(text), "sent": len(compress(text))}


def main() -> None:
    conn = sqlite3.connect(AGENTS / "data" / "jobs.db")
    conn.row_factory = sqlite3.Row

    runs = []
    for r in conn.execute("select id, started_at, finished_at, stats from runs order by id"):
        s = json.loads(r["stats"])
        runs.append({"id": r["id"], "start": r["started_at"], "end": r["finished_at"], **{k: s.get(k) for k in (
            "boards", "postings_fetched", "new_postings", "closed_since_last_run", "passed_filter", "early_career",
            "level_not_stated", "distinct_bodies_to_score", "dropped_by", "llm_scored", "tokens", "model", "strong_new")}})

    # Dropped postings by reason, with examples (first run's first sightings)
    by_reason: dict[str, Counter] = defaultdict(Counter)
    examples: dict[str, list] = defaultdict(list)
    for r in conn.execute("select company, title, location, filter_reason from jobs where filter_reason is not null order by company, title"):
        cat, _, detail = r["filter_reason"].partition(":")
        by_reason[cat][detail.strip()] += 1
        if len(examples[cat]) < 40:
            examples[cat].append({"company": r["company"], "title": r["title"], "location": r["location"], "why": detail.strip()})
    dropped = {cat: {"plain": FILTER_PLAIN.get(cat, cat), "total": sum(c.values()),
                     "top": [{"why": k, "n": n} for k, n in c.most_common(6)], "examples": examples[cat]}
               for cat, c in by_reason.items()}

    kept = []
    for r in conn.execute("""select company, title, location, url, score, scorer, reasons, gaps, quote, grounded, tier,
                             keyword_score, pay_min, pay_max, family from jobs where family is not null
                             order by (scorer = 'llm') desc, score desc, company"""):
        kept.append({"company": r["company"], "title": r["title"], "location": r["location"], "url": r["url"],
                     "score": r["score"], "scorer": r["scorer"], "kw": r["keyword_score"], "tier": r["tier"],
                     "family": r["family"], "payMin": r["pay_min"], "payMax": r["pay_max"],
                     "reasons": json.loads(r["reasons"] or "[]"), "gaps": json.loads(r["gaps"] or "[]"),
                     "quote": r["quote"], "grounded": None if r["grounded"] is None else bool(r["grounded"])})

    profile = (AGENTS / "jobs" / "profile.md").read_text()
    companies = tomllib.loads((AGENTS / "jobs" / "companies.toml").read_text())
    boards = [{"company": name, "ats": ats} for ats, table in companies.items() if ats in ("greenhouse", "ashby", "lever") for name in table]

    tracker = json.loads((AGENTS / "data" / "tracker.json").read_text())["entries"]
    calls = [{"company": e["role"]["company"], "title": e["role"]["title"], "status": e["status"],
              "at": e["history"][-1]["at"]} for e in tracker.values()]

    coverage_file = AGENTS / "data" / "coverage.json"
    coverage = json.loads(coverage_file.read_text()) if coverage_file.exists() else None

    data = {
        "agent": {"name": "Job radar",
                  "line": "Reads 76 company job boards every other day and tells you which new-grad roles are worth applying to.",
                  "lastRun": runs[-1]["end"] if runs else None},
        "car": {
            "boards": boards,
            "families": section(profile, "Target role families (in rough priority order)"),
            "wants": section(profile, "Wants"),
            "dealbreakers": section(profile, "Dealbreakers (score low)"),
            "filters": [{"key": k, "plain": v} for k, v in FILTER_PLAIN.items()],
            "model": "Claude Opus 5.5",
            "perPosting": MODEL_CHECK["opusPerPosting"],
            "inputTokens": 2600,
            "maxPerRun": 40,
        },
        "logos": logos(),
        "firstLap": FIRST_LAP,
        "lessons": LESSONS,
        "example": example(conn),
        "modelCheck": MODEL_CHECK,
        "compare": compare_digest(),
        "coverage": {"logged": len(coverage.get("finds", [])) if coverage else 0},
        "runs": runs,
        "dropped": dropped,
        "kept": kept,
        "calls": calls,
    }
    OUT.write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=False))
    print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size / 1e3:.0f} KB), {len(data['logos'])} logos, "
          f"{len(kept)} kept, {len(runs)} runs")


if __name__ == "__main__":
    main()
