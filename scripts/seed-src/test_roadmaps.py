"""Tests for the roadmap module ordering in roadmaps.py. Run: python3 -m unittest discover -s scripts/seed-src -p "test_*.py" """
import unittest

from roadmaps import JUNIOR_TOP, build, order_modules


def mod(level, kind="Core", requires=()):
    return {"level": level, "kind": kind, "requires": list(requires)}


class OrderModulesTests(unittest.TestCase):
    def test_sorts_by_level_keeping_the_authored_order_within_a_level(self):
        mods = {"a": mod("Intermediate"), "b": mod("Beginner"), "c": mod("Advanced"), "d": mod("Beginner"), "e": mod("Intermediate")}
        self.assertEqual(["b", "d", "a", "e", "c"], order_modules(["a", "b", "c", "d", "e"], mods))

    def test_keeps_the_optional_marker(self):
        mods = {"a": mod("Advanced"), "b": mod("Beginner")}
        self.assertEqual(["b?", "a"], order_modules(["a", "b?"], mods))

    def test_capstone_always_last(self):
        mods = {"cap": mod("Expert", kind="Capstone"), "x": mod("Expert"), "y": mod("Beginner")}
        self.assertEqual(["y", "x", "cap"], order_modules(["cap", "x", "y"], mods))

    def test_a_module_follows_the_modules_it_requires(self):
        mods = {"basics": mod("Beginner"), "deep": mod("Beginner", requires=["basics"])}
        self.assertEqual(["basics", "deep"], order_modules(["deep", "basics"], mods))


class JuniorRecommendationTests(unittest.TestCase):
    def test_the_six_junior_roadmaps_are_ranked_in_order(self):
        ranked = sorted((r for r in build() if r["juniorRank"] is not None), key=lambda r: r["juniorRank"])
        self.assertEqual(["junior-software-engineer", "computer-science-fundamentals", "git-and-collaboration",
                          "javascript-developer", "sql", "data-structures-and-algorithms"], [r["slug"] for r in ranked])
        self.assertEqual([1, 2, 3, 4, 5, 6], [r["juniorRank"] for r in ranked])

    def test_every_other_roadmap_has_no_junior_rank(self):
        others = [r for r in build() if r["slug"] not in JUNIOR_TOP]
        self.assertTrue(others)
        self.assertTrue(all(r["juniorRank"] is None for r in others))


    def test_the_junior_path_offers_the_beginner_modules_of_the_other_junior_roadmaps_as_optional(self):
        junior = next(r for r in build() if r["slug"] == "junior-software-engineer")
        optional = {m["slug"] for m in junior["modules"] if not m["required"]}
        self.assertLessEqual({"git-collaboration", "javascript-core", "linear-data-structures", "how-computers-work"}, optional)


if __name__ == "__main__":
    unittest.main()
