"""Validates the module catalog (modules.json) and the roadmap compositions (roadmaps.json).

Usage: python3 scripts/seed-src/validate_catalog.py
Exit code 1 when any error is found. Prints a reuse report (module -> roadmaps).

Rules (see CATALOG_AUTHORING.md):
- every roadmap references existing modules; every module is used by a roadmap or marked standalone;
- module dependencies and roadmap prerequisites reference existing items and have no cycles;
- every step scope (topic/subtopic) exists and has at least MIN_STEP_QUESTIONS questions;
- a scope belongs to exactly one module (so a step is proven once and counts everywhere);
- new Role and Language roadmaps have at least one Context module and exactly one Capstone;
- Core modules are reused by at least 2 roadmaps.
"""
import collections
import glob
import json
import os
import sys
from dataclasses import dataclass, field

DEFAULT_DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend/TechRat.Infrastructure/Seed/Data"))
KINDS = {"Core", "Context", "BestPractices", "Capstone"}
LEVELS = {"Beginner", "Intermediate", "Advanced", "Expert"}
LEVEL_RANK = {"Beginner": 0, "Intermediate": 1, "Advanced": 2, "Expert": 3}
ROADMAP_TYPES = {"Role", "Language", "SkillTrack", "BestPractices"}
TYPES_NEEDING_CAPSTONE = {"Role", "Language"}
MIN_STEP_QUESTIONS = 5
MODULE_KEYS = {"slug", "name", "description", "kind", "category", "level", "icon", "standalone", "requires", "steps"}
ROADMAP_KEYS = {"slug", "name", "category", "difficulty", "icon", "type", "description", "estimatedHours", "prerequisites", "modules"}


@dataclass
class Result:
    errors: list = field(default_factory=list)
    reuse: dict = field(default_factory=dict)
    stats: dict = field(default_factory=dict)


def _load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _cycle(graph):
    """Returns one cycle (list of nodes) in a directed graph {node: [deps]}, or None."""
    state, stack = {}, []

    def visit(n):
        state[n] = 1
        stack.append(n)
        for d in graph.get(n, []):
            if state.get(d) == 1:
                return stack[stack.index(d):] + [d]
            if d not in state:
                found = visit(d)
                if found:
                    return found
        stack.pop()
        state[n] = 2
        return None

    for node in sorted(graph):
        if node not in state:
            found = visit(node)
            if found:
                return found
    return None


def validate(data_dir=DEFAULT_DATA_DIR):
    result = Result()
    errors = result.errors
    topics = _load(os.path.join(data_dir, "topics.json"))
    modules = _load(os.path.join(data_dir, "modules.json"))
    roadmaps = _load(os.path.join(data_dir, "roadmaps.json"))
    questions = [q for f in sorted(glob.glob(os.path.join(data_dir, "questions", "*.json"))) for q in _load(f)]

    valid = {t["slug"]: {s["slug"] for s in t["subtopics"]} for t in topics}
    per_scope = collections.Counter((q["topic"], q["subtopic"]) for q in questions)
    per_topic = collections.Counter(q["topic"] for q in questions)
    by_slug = {}

    # Modules ----------------------------------------------------------------
    scope_owner = collections.defaultdict(list)
    for m in modules:
        slug = m.get("slug", "?")
        missing = MODULE_KEYS - set(m)
        if missing:
            errors.append(f"{slug}: missing keys {sorted(missing)}")
            continue
        if slug in by_slug:
            errors.append(f"{slug}: duplicate module slug")
        by_slug[slug] = m
        if m["kind"] not in KINDS:
            errors.append(f"{slug}: unknown kind {m['kind']}")
        if m["level"] not in LEVELS:
            errors.append(f"{slug}: unknown level {m['level']}")
        if not m["steps"]:
            errors.append(f"{slug}: module has no steps")
        for st in m["steps"]:
            topic, sub = st.get("topic"), st.get("subtopic")
            label = f"{topic}/{sub}" if sub else f"{topic}"
            if topic not in valid or (sub is not None and sub not in valid[topic]):
                errors.append(f"{slug}: step {label} has an unknown topic/subtopic")
                continue
            available = per_scope[(topic, sub)] if sub else per_topic[topic]
            if available < MIN_STEP_QUESTIONS:
                errors.append(f"{slug}: step {label} has {available} questions (needs at least {MIN_STEP_QUESTIONS})")
            if not str(st.get("title", "")).strip():
                errors.append(f"{slug}: step {label} has no title")
            scope_owner[(topic, sub)].append(slug)
    for (topic, sub), owners in sorted(scope_owner.items(), key=lambda kv: (kv[0][0], kv[0][1] or "")):
        if len(owners) > 1:
            errors.append(f"scope {topic}/{sub} is in more than one module ({', '.join(owners)})")

    for m in by_slug.values():
        for dep in m["requires"]:
            if dep not in by_slug:
                errors.append(f"{m['slug']}: requires unknown module {dep}")
    cyc = _cycle({s: [d for d in m["requires"] if d in by_slug] for s, m in by_slug.items()})
    if cyc:
        errors.append("module dependency cycle: " + " -> ".join(cyc))

    # Roadmaps ---------------------------------------------------------------
    roadmap_slugs = {r.get("slug") for r in roadmaps}
    used_by = collections.defaultdict(list)
    for r in roadmaps:
        slug = r.get("slug", "?")
        missing = ROADMAP_KEYS - set(r)
        if missing:
            errors.append(f"{slug}: missing keys {sorted(missing)}")
            continue
        if r["type"] not in ROADMAP_TYPES:
            errors.append(f"{slug}: unknown type {r['type']}")
        refs = [x["slug"] for x in r["modules"]]
        if len(refs) != len(set(refs)):
            errors.append(f"{slug}: a module appears twice")
        if not any(x.get("required", True) for x in r["modules"]):
            errors.append(f"{slug}: needs at least one required module")
        for ref in refs:
            if ref not in by_slug:
                errors.append(f"{slug}: unknown module {ref}")
            elif slug not in used_by[ref]:
                used_by[ref].append(slug)
        # Structure: levels never drop along the path, prerequisite modules come first, the capstone closes it.
        known = [x for x in refs if x in by_slug]
        for prev, cur in zip(known, known[1:]):
            if LEVEL_RANK.get(by_slug[cur]["level"], 0) < LEVEL_RANK.get(by_slug[prev]["level"], 0) and by_slug[cur]["kind"] != "Capstone":
                errors.append(f"{slug}: {cur} ({by_slug[cur]['level']}) comes after {prev} ({by_slug[prev]['level']}); "
                              "order modules from easier to harder levels")
        for i, ref in enumerate(known):
            for dep in by_slug[ref]["requires"]:
                if dep in known[i + 1:]:
                    errors.append(f"{slug}: {ref} requires {dep}, which comes later")
            if by_slug[ref]["kind"] == "Capstone" and i != len(known) - 1:
                errors.append(f"{slug}: the Capstone {ref} must be the last module")
        for p in r["prerequisites"]:
            if p["slug"] not in roadmap_slugs:
                errors.append(f"{slug}: prerequisite {p['slug']} does not exist")
        if r.get("new", True) and r["type"] in TYPES_NEEDING_CAPSTONE:
            kinds = [by_slug[x]["kind"] for x in refs if x in by_slug]
            if "Context" not in kinds:
                errors.append(f"{slug}: needs at least one Context module")
            capstones = kinds.count("Capstone")
            if capstones != 1:
                errors.append(f"{slug}: needs exactly one Capstone module (found {capstones})")
    cyc = _cycle({r["slug"]: [p["slug"] for p in r.get("prerequisites", [])] for r in roadmaps if "slug" in r})
    if cyc:
        errors.append("roadmap prerequisite cycle: " + " -> ".join(cyc))

    for slug, m in by_slug.items():
        users = used_by.get(slug, [])
        if not users and not m["standalone"]:
            errors.append(f"{slug}: not used by any roadmap and not marked standalone")
        if m["kind"] == "Core" and len(users) < 2:
            errors.append(f"{slug}: Core module used by {len(users)} roadmap(s); reuse it in at least 2 roadmaps or make it Context")

    result.reuse = {slug: sorted(used_by.get(slug, [])) for slug in sorted(by_slug)}
    result.stats = {
        "modules": len(by_slug),
        "by_kind": dict(collections.Counter(m["kind"] for m in by_slug.values())),
        "reused_2plus": sum(1 for v in result.reuse.values() if len(v) >= 2),
        "roadmaps": len(roadmaps),
        "steps": sum(len(m["steps"]) for m in by_slug.values()),
    }
    return result


def main():
    result = validate()
    s = result.stats
    print(f"modules={s['modules']} by kind={s['by_kind']} reused by 2+ roadmaps={s['reused_2plus']} roadmaps={s['roadmaps']} steps={s['steps']}")
    print("reuse report (module -> roadmaps):")
    for slug, users in result.reuse.items():
        print(f"  {slug:40s} {len(users):2d}  {', '.join(users)}")
    for e in result.errors:
        print("ERROR", e)
    print(f"{len(result.errors)} error(s)")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
