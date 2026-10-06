"""Tests for readme_catalog.py. Run: python3 -m unittest discover -s scripts/seed-src -p "test_*.py" """
import json
import os
import tempfile
import unittest

import readme_catalog as rc

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def q(qid, topic, sub, difficulty):
    return {"id": qid, "topic": topic, "subtopic": sub, "difficulty": difficulty}


class FakeSeed:
    """Writes a minimal seed data directory."""

    def __init__(self, tmp):
        self.dir = tmp
        os.makedirs(os.path.join(tmp, "questions"))
        os.makedirs(os.path.join(tmp, "i18n"))
        self.write("topics.json", [
            {"slug": "git", "name": "Git", "category": "Tools", "subtopics": [{"slug": "basics", "name": "Basics"}, {"slug": "rebase", "name": "Rebase"}]},
            {"slug": "sql", "name": "SQL", "category": "Data", "subtopics": [{"slug": "joins", "name": "Joins"}]},
        ])
        self.write("modules.json", [
            {"slug": "git-basics", "name": "Git Basics", "kind": "Core", "steps": [
                {"topic": "git", "subtopic": "basics", "title": "Basics"}, {"topic": "git", "subtopic": "rebase", "title": "Rebase"}]},
            {"slug": "sql-joins", "name": "SQL Joins", "kind": "Context", "steps": [{"topic": "sql", "subtopic": "joins", "title": "Joins"}]},
            {"slug": "git-extra", "name": "Git Extra", "kind": "Context", "steps": [{"topic": "git", "subtopic": "basics", "title": "Again"}]},
        ])
        self.write("roadmaps.json", [
            {"slug": "git-path", "name": "Git Path", "category": "Tools", "difficulty": "Beginner", "type": "SkillTrack", "estimatedHours": 4,
             "prerequisites": [], "modules": [{"slug": "git-basics", "required": True}]},
            {"slug": "sql-path", "name": "SQL Path", "category": "Data", "difficulty": "Advanced", "type": "Role", "estimatedHours": 6,
             "prerequisites": [{"slug": "git-path", "minimumPercent": 50}],
             "modules": [{"slug": "sql-joins", "required": True}, {"slug": "git-basics", "required": True}, {"slug": "git-extra", "required": False}]},
        ])
        self.write("questions/a.json", [q("g1", "git", "basics", "Easy"), q("g2", "git", "basics", "Medium"), q("g3", "git", "rebase", "Easy")])
        self.write("questions/b.json", [q("s1", "sql", "joins", "Hard"), q("s2", "sql", "joins", "Expert")])
        self.write("i18n/pt-BR.json", {"topics": {}, "roadmaps": {"git-path": {"name": "Trilha Git"}}, "achievements": {}})

    def write(self, rel, data):
        with open(os.path.join(self.dir, rel), "w", encoding="utf-8") as f:
            json.dump(data, f)


class CatalogMarkdownTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.seed = FakeSeed(self._tmp.name)
        self.md = rc.build_catalog_markdown(self.seed.dir)

    def tearDown(self):
        self._tmp.cleanup()

    def test_counts_questions_in_total_and_by_difficulty(self):
        self.assertIn("**5** multiple-choice questions", self.md)
        self.assertIn("Easy 2 · Medium 1 · Hard 1 · Expert 1", self.md)

    def test_counts_questions_per_topic(self):
        self.assertIn("| Git | Tools | 2 | 3 |", self.md)
        self.assertIn("| SQL | Data | 1 | 2 |", self.md)

    def test_lists_every_roadmap_with_its_size_and_questions(self):
        self.assertIn("**2** roadmaps built from **3** modules (1 shared by 2+ roadmaps) · 4 module steps.", self.md)
        # Steps = steps of required modules; questions = distinct questions across all of the roadmap's module scopes.
        self.assertIn("| 1 | Git Path | Trilha Git | SkillTrack | Tools | Beginner | 1 | 2 | 4 h | 3 | — |", self.md)
        self.assertIn("| 2 | SQL Path | SQL Path | Role | Data | Advanced | 3 (1 optional) | 3 | 6 h | 5 | Git Path (50%) |", self.md)

    def test_lists_modules_with_kind_and_usage(self):
        self.assertIn("| Git Basics | Core | 2 | Git Path, SQL Path |", self.md)
        self.assertIn("| SQL Joins | Context | 1 | SQL Path |", self.md)

    def test_output_is_deterministic(self):
        self.assertEqual(self.md, rc.build_catalog_markdown(self.seed.dir))


class ReadmeBlockTests(unittest.TestCase):
    def test_replaces_only_the_marked_block(self):
        readme = f"intro\n{rc.START}\nold\n{rc.END}\noutro\n"
        updated = rc.replace_block(readme, "new")
        self.assertEqual(f"intro\n{rc.START}\nnew\n{rc.END}\noutro\n", updated)
        self.assertEqual(updated, rc.replace_block(updated, "new"))

    def test_missing_markers_is_an_error(self):
        with self.assertRaises(ValueError):
            rc.replace_block("no markers here", "new")


class RepositoryReadmeTests(unittest.TestCase):
    def test_readme_catalog_matches_the_seed(self):
        """Fails when roadmaps or questions change without regenerating the README (python3 scripts/seed-src/readme_catalog.py)."""
        with open(os.path.join(REPO, "README.md"), encoding="utf-8") as f:
            readme = f.read()
        expected = rc.replace_block(readme, rc.build_catalog_markdown(rc.DEFAULT_DATA_DIR))
        self.assertEqual(expected, readme, "README catalog is out of date: run python3 scripts/seed-src/readme_catalog.py")


if __name__ == "__main__":
    unittest.main()
