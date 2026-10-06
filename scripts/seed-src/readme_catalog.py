"""Generates the "Catalog" section of README.md (roadmaps and question counts) from the seed data.

Usage:
    python3 scripts/seed-src/readme_catalog.py          # rewrite the block between the catalog markers
    python3 scripts/seed-src/readme_catalog.py --check  # exit 1 if README.md is out of date (CI)

The block lives between <!-- catalog:start --> and <!-- catalog:end --> and must never be edited by hand.
"""
import collections
import glob
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
DEFAULT_DATA_DIR = os.path.join(REPO, "backend", "TechRat.Infrastructure", "Seed", "Data")
README = os.path.join(REPO, "README.md")
START = "<!-- catalog:start -->"
END = "<!-- catalog:end -->"
DIFFICULTIES = ["Easy", "Medium", "Hard", "Expert"]


def _load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _n(value):
    return f"{value:,}"


def build_catalog_markdown(data_dir):
    """Markdown for the catalog block: question totals, questions per topic and every roadmap."""
    topics = _load(os.path.join(data_dir, "topics.json"))
    roadmaps = _load(os.path.join(data_dir, "roadmaps.json"))
    questions = [q for f in sorted(glob.glob(os.path.join(data_dir, "questions", "*.json"))) for q in _load(f)]
    pt_path = os.path.join(data_dir, "i18n", "pt-BR.json")
    pt_roadmaps = _load(pt_path).get("roadmaps", {}) if os.path.exists(pt_path) else {}

    by_difficulty = collections.Counter(q["difficulty"] for q in questions)
    by_topic = collections.Counter(q["topic"] for q in questions)
    ids_by_scope = collections.defaultdict(set)
    for q in questions:
        ids_by_scope[(q["topic"], q["subtopic"])].add(q["id"])
        ids_by_scope[(q["topic"], None)].add(q["id"])
    names = {r["slug"]: r["name"] for r in roadmaps}

    modules = sum(len(r["modules"]) for r in roadmaps)
    steps = sum(len(m["steps"]) for r in roadmaps for m in r["modules"])

    lines = [
        "## Catalog",
        "",
        "_Generated from the seed data by `python3 scripts/seed-src/readme_catalog.py`. Do not edit by hand; CI fails when it is out of date._",
        "",
        "### Questions",
        "",
        f"**{_n(len(questions))}** multiple-choice questions: "
        + " · ".join(f"{d} {_n(by_difficulty.get(d, 0))}" for d in DIFFICULTIES) + ".",
        "",
        "<details><summary>Questions per topic</summary>",
        "",
        "| Topic | Category | Subtopics | Questions |",
        "|---|---|---:|---:|",
    ]
    for t in topics:
        lines.append(f"| {t['name']} | {t['category']} | {len(t['subtopics'])} | {_n(by_topic.get(t['slug'], 0))} |")
    lines += [
        "",
        "</details>",
        "",
        "### Roadmaps",
        "",
        f"**{len(roadmaps)}** roadmaps · {_n(modules)} modules · {_n(steps)} steps.",
        "",
        "| # | Roadmap | Português | Category | Difficulty | Modules | Steps | Estimate | Questions | Prerequisites |",
        "|---:|---|---|---|---|---:|---:|---:|---:|---|",
    ]
    for i, r in enumerate(roadmaps, 1):
        r_steps = [s for m in r["modules"] for s in m["steps"]]
        available = set().union(*(ids_by_scope[(s["topic"], s.get("subtopic"))] for s in r_steps)) if r_steps else set()
        prereqs = ", ".join(f"{names.get(p['slug'], p['slug'])} ({p['minimumPercent']}%)" for p in r.get("prerequisites", [])) or "—"
        pt_name = pt_roadmaps.get(r["slug"], {}).get("name") or r["name"]
        lines.append(
            f"| {i} | {r['name']} | {pt_name} | {r['category']} | {r['difficulty']} | {len(r['modules'])} | {len(r_steps)} "
            f"| {r['estimatedHours']} h | {_n(len(available))} | {prereqs} |"
        )
    return "\n".join(lines)


def replace_block(readme, block):
    """Replaces the text between the catalog markers; raises ValueError when they are missing."""
    start, end = readme.find(START), readme.find(END)
    if start < 0 or end < start:
        raise ValueError(f"README.md must contain {START} followed by {END}")
    return readme[: start + len(START)] + "\n" + block + "\n" + readme[end:]


def main(argv):
    with open(README, encoding="utf-8", newline="") as f:
        raw = f.read()
    newline = "\r\n" if "\r\n" in raw else "\n"
    current = raw.replace("\r\n", "\n")
    updated = replace_block(current, build_catalog_markdown(DEFAULT_DATA_DIR))
    if "--check" in argv:
        if updated != current:
            print("README.md catalog is out of date. Run: python3 scripts/seed-src/readme_catalog.py")
            return 1
        print("README.md catalog is up to date.")
        return 0
    if updated != current:
        with open(README, "w", encoding="utf-8", newline="") as f:
            f.write(updated.replace("\n", newline))
        print("README.md catalog updated.")
    else:
        print("README.md catalog already up to date.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
