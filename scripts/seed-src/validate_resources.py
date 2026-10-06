"""Validates the study resources (Seed/Data/resources.json): the recommended reading of each roadmap and module.

Usage: python3 scripts/seed-src/validate_resources.py [--check-urls]
Exit code 1 when any error is found. `--check-urls` also requests every distinct URL and fails on anything but a 2xx
answer (network needed; the offline checks are what CI runs).

Shape:
  {"roadmaps": {"<roadmap-slug>": {"sources": [source, ...]}},
   "modules":  {"<module-slug>":  {"topics": [{"key", "name": {"en", "pt-BR"}, "sources": [source, ...]}]}}}
  source = {"title", "url" (https), "type", "language", "note": {"en", "pt-BR"} (optional)}
Rules: every roadmap and module has resources (the unit tests and CI enforce it), slugs exist in roadmaps.json / modules.json, every text a learner reads exists in English and Portuguese
(topic names and notes; a source's title stays in the language of the source), a topic has at least one source, a URL
appears once per topic list, and links are never invented: each one must have been opened (see CATALOG_AUTHORING.md).
"""
import json
import os
import sys
import urllib.request
from dataclasses import dataclass, field

DEFAULT_DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend/TechRat.Infrastructure/Seed/Data"))
TYPES = ("official-docs", "article", "book", "course", "video", "spec")
LANGUAGES = ("en", "pt-BR")
LOCALES = ("en", "pt-BR")


@dataclass
class Result:
    errors: list = field(default_factory=list)
    topics: int = 0
    sources: int = 0
    urls: set = field(default_factory=set)
    missing_roadmaps: list = field(default_factory=list)
    missing_modules: list = field(default_factory=list)


def _load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _bilingual(value):
    return isinstance(value, dict) and all(isinstance(value.get(k), str) and value[k].strip() for k in LOCALES)


def _check_sources(sources, where, result):
    if not isinstance(sources, list):
        result.errors.append(f"{where}: sources must be a list")
        return
    seen = set()
    for i, s in enumerate(sources):
        at = f"{where} source #{i + 1}"
        if not isinstance(s, dict):
            result.errors.append(f"{at}: must be an object")
            continue
        result.sources += 1
        if not str(s.get("title", "")).strip():
            result.errors.append(f"{at}: title is empty")
        url = str(s.get("url", ""))
        if not url.startswith("https://"):
            result.errors.append(f"{at}: url must be https ({url!r})")
        elif url in seen:
            result.errors.append(f"{at}: duplicate url {url}")
        seen.add(url)
        result.urls.add(url)
        if s.get("type") not in TYPES:
            result.errors.append(f"{at}: unknown type {s.get('type')!r}")
        if s.get("language") not in LANGUAGES:
            result.errors.append(f"{at}: unknown language {s.get('language')!r}")
        if "note" in s and not _bilingual(s["note"]):
            result.errors.append(f"{at}: note needs en and pt-BR")
        extra = set(s) - {"title", "url", "type", "language", "note"}
        if extra:
            result.errors.append(f"{at}: unexpected keys {sorted(extra)}")


def validate(data_dir=DEFAULT_DATA_DIR):
    result = Result()
    roadmaps = {r["slug"]: r for r in _load(os.path.join(data_dir, "roadmaps.json"))}
    modules = {m["slug"]: m for m in _load(os.path.join(data_dir, "modules.json"))}
    data = _load(os.path.join(data_dir, "resources.json"))

    for slug, entry in data.get("roadmaps", {}).items():
        if slug not in roadmaps:
            result.errors.append(f"roadmap {slug} is not in roadmaps.json")
            continue
        _check_sources(entry.get("sources", []), f"roadmap {slug}", result)
        if not entry.get("sources"):
            result.errors.append(f"roadmap {slug}: has no sources")

    for slug, entry in data.get("modules", {}).items():
        if slug not in modules:
            result.errors.append(f"module {slug} is not in modules.json")
            continue
        keys = set()
        topics = entry.get("topics", [])
        if not topics:
            result.errors.append(f"module {slug}: has no topics")
        for t in topics:
            where = f"module {slug} topic {t.get('key', '?')}"
            result.topics += 1
            if not str(t.get("key", "")).strip():
                result.errors.append(f"{where}: key is empty")
            elif t["key"] in keys:
                result.errors.append(f"module {slug}: duplicate topic key {t['key']!r}")
            keys.add(t.get("key"))
            if not _bilingual(t.get("name")):
                result.errors.append(f"{where}: name needs en and pt-BR")
            if not t.get("sources"):
                result.errors.append(f"{where}: has no sources")
            _check_sources(t.get("sources", []), where, result)

    result.missing_roadmaps = [s for s in roadmaps if s not in data.get("roadmaps", {})]
    result.missing_modules = [s for s in modules if s not in data.get("modules", {})]
    return result


def check_urls(urls):
    """Opens every URL; returns the ones that do not answer 2xx."""
    bad = []
    for url in sorted(urls):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "TechRat-link-check"})
            with urllib.request.urlopen(req, timeout=25) as r:
                if not 200 <= r.status < 300:
                    bad.append((url, r.status))
        except Exception as e:  # noqa: BLE001 - any failure means the link needs a look
            bad.append((url, str(e)))
    return bad


def main(argv):
    result = validate()
    for e in result.errors:
        print("ERROR", e)
    print(f"topics={result.topics} sources={result.sources} distinct urls={len(result.urls)}")
    for slug in result.missing_roadmaps:
        print("ERROR roadmap", slug, "has no study resources")
        result.errors.append(slug)
    for slug in result.missing_modules:
        print("ERROR module", slug, "has no study resources")
        result.errors.append(slug)
    if "--check-urls" in argv:
        bad = check_urls(result.urls)
        for url, why in bad:
            print("BROKEN", why, url)
        result.errors.extend(b[0] for b in bad)
    print(f"{len(result.errors)} error(s)")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
