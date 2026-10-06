"""Tests for the roadmap module ordering in roadmaps.py. Run: python3 -m unittest discover -s scripts/seed-src -p "test_*.py" """
import unittest

from roadmaps import order_modules


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


if __name__ == "__main__":
    unittest.main()
