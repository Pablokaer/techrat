"""Tests for validate_catalog.py. Run: python3 -m unittest discover -s scripts/seed-src -p "test_*.py" """
import json
import os
import tempfile
import unittest

import validate_catalog as vc


def step(topic, sub, title=None):
    return {"topic": topic, "subtopic": sub, "title": title or sub.title()}


def module(slug, kind="Core", steps=None, requires=(), standalone=False):
    return {"slug": slug, "name": slug.replace("-", " ").title(), "description": f"About {slug}.", "kind": kind,
            "category": "Data", "level": "Beginner", "icon": "layers", "standalone": standalone,
            "requires": list(requires), "steps": steps or []}


def roadmap(slug, modules, rtype="Role", prereqs=()):
    return {"slug": slug, "name": slug.title(), "category": "Data", "difficulty": "Beginner", "icon": "map", "type": rtype,
            "description": f"Path {slug}.", "estimatedHours": 5, "prerequisites": [{"slug": s, "minimumPercent": p} for s, p in prereqs],
            "modules": [{"slug": m, "required": req} for m, req in modules]}


class Seed:
    def __init__(self, tmp):
        self.dir = tmp
        os.makedirs(os.path.join(tmp, "questions"))
        self.topics = [{"slug": "sql", "subtopics": [{"slug": s} for s in ("basics", "joins", "windows", "biz", "final")]},
                       {"slug": "py", "subtopics": [{"slug": s} for s in ("core", "pandas")]}]
        self.questions = {(t["slug"], s["slug"]): 6 for t in self.topics for s in t["subtopics"]}

    def write(self, modules, roadmaps, legacy=None):
        def dump(rel, data):
            with open(os.path.join(self.dir, rel), "w", encoding="utf-8") as f:
                json.dump(data, f)
        dump("topics.json", self.topics)
        dump("modules.json", modules)
        dump("roadmaps.json", roadmaps)
        qs = []
        for (t, s), n in self.questions.items():
            qs += [{"id": f"{t}-{s}-{i}", "topic": t, "subtopic": s} for i in range(n)]
        dump("questions/all.json", qs)
        return vc.validate(self.dir)


def good_catalog():
    modules = [
        module("sql-foundations", steps=[step("sql", "basics"), step("sql", "joins")]),
        module("sql-for-analytics", steps=[step("sql", "windows")], requires=["sql-foundations"]),
        module("python-core", steps=[step("py", "core")]),
        module("business-questions", kind="Context", steps=[step("sql", "biz")]),
        module("analyst-capstone", kind="Capstone", steps=[step("sql", "final")]),
        module("pandas-basics", kind="Context", steps=[step("py", "pandas")]),
    ]
    roadmaps = [
        roadmap("data-analyst", [("sql-foundations", True), ("sql-for-analytics", True), ("python-core", True),
                                 ("business-questions", True), ("analyst-capstone", True)]),
        roadmap("sql", [("sql-foundations", True), ("sql-for-analytics", True)], rtype="SkillTrack"),
        roadmap("python-data", [("python-core", True), ("pandas-basics", True)], rtype="SkillTrack", prereqs=[("sql", 30)]),
    ]
    return modules, roadmaps


class ValidateCatalogTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.seed = Seed(self._tmp.name)

    def tearDown(self):
        self._tmp.cleanup()

    def assertError(self, result, fragment):
        self.assertTrue(any(fragment in e for e in result.errors), f"no error containing {fragment!r} in {result.errors}")

    def test_good_catalog_passes_and_reports_reuse(self):
        result = self.seed.write(*good_catalog())
        self.assertEqual([], result.errors)
        self.assertEqual(["data-analyst", "sql"], result.reuse["sql-foundations"])

    def test_roadmaps_must_reference_existing_modules(self):
        modules, roadmaps = good_catalog()
        roadmaps[1]["modules"].append({"slug": "ghost", "required": True})
        self.assertError(self.seed.write(modules, roadmaps), "sql: unknown module ghost")

    def test_unused_modules_must_be_standalone(self):
        modules, roadmaps = good_catalog()
        modules.append(module("orphan", kind="Context", steps=[step("py", "pandas")]))
        modules[-2]["steps"] = []  # avoid the duplicate-scope error for this test
        result = self.seed.write(modules, roadmaps)
        self.assertError(result, "orphan: not used by any roadmap")

    def test_module_and_roadmap_cycles_are_rejected(self):
        modules, roadmaps = good_catalog()
        modules[0]["requires"] = ["sql-for-analytics"]
        roadmaps[1]["prerequisites"] = [{"slug": "python-data", "minimumPercent": 10}]
        result = self.seed.write(modules, roadmaps)
        self.assertError(result, "module dependency cycle")
        self.assertError(result, "roadmap prerequisite cycle")

    def test_each_scope_needs_enough_questions(self):
        self.seed.questions[("sql", "joins")] = 0
        self.assertError(self.seed.write(*good_catalog()), "sql-foundations: step sql/joins has 0 questions")

    def test_a_scope_belongs_to_one_module_only(self):
        modules, roadmaps = good_catalog()
        modules[2]["steps"].append(step("sql", "basics"))
        self.assertError(self.seed.write(modules, roadmaps), "scope sql/basics is in more than one module")

    def test_role_roadmaps_need_a_context_module_and_exactly_one_capstone(self):
        modules, roadmaps = good_catalog()
        roadmaps[0]["modules"] = [m for m in roadmaps[0]["modules"] if m["slug"] != "analyst-capstone"]
        modules = [m for m in modules if m["slug"] != "analyst-capstone"]
        self.assertError(self.seed.write(modules, roadmaps), "data-analyst: needs exactly one Capstone module (found 0)")

    def test_skill_tracks_do_not_need_a_capstone(self):
        result = self.seed.write(*good_catalog())
        self.assertFalse(any(e.startswith("sql:") for e in result.errors))

    def test_core_modules_must_be_reused(self):
        modules, roadmaps = good_catalog()
        roadmaps[2]["modules"] = [{"slug": "pandas-basics", "required": True}]
        modules[2]["standalone"] = True
        self.assertError(self.seed.write(modules, roadmaps), "python-core: Core module used by 1 roadmap(s)")

    def test_existing_roadmaps_are_exempt_from_the_new_roadmap_rules(self):
        modules, roadmaps = good_catalog()
        roadmaps[0]["new"] = False
        roadmaps[0]["modules"] = [{"slug": m, "required": True} for m in ("sql-foundations", "sql-for-analytics", "python-core", "business-questions")]
        modules = [m for m in modules if m["slug"] != "analyst-capstone"]
        self.assertEqual([], self.seed.write(modules, roadmaps).errors)


if __name__ == "__main__":
    unittest.main()
