"""Tests for validate_resources.py. Run: python3 -m unittest discover -s scripts/seed-src -p "test_*.py" """
import json
import os
import tempfile
import unittest

import validate_resources as vr


def source(url="https://git-scm.com/docs", **overrides):
    s = {"title": "Git documentation", "url": url, "type": "official-docs", "language": "en"}
    s.update(overrides)
    return s


def topic(key="basics", sources=None, **overrides):
    t = {"key": key, "name": {"en": "Basics", "pt-BR": "Básico"}, "sources": sources if sources is not None else [source()]}
    t.update(overrides)
    return t


class Seed:
    def __init__(self, tmp, resources):
        os.makedirs(tmp, exist_ok=True)
        self.dir = tmp
        self.write("roadmaps.json", [{"slug": "git-path", "modules": [{"slug": "git-basics", "required": True}]}])
        self.write("modules.json", [{"slug": "git-basics", "steps": []}, {"slug": "git-extra", "steps": []}])
        self.write("resources.json", resources)

    def write(self, name, data):
        with open(os.path.join(self.dir, name), "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)


class ValidateResourcesTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()

    def tearDown(self):
        self._tmp.cleanup()

    def run_with(self, resources):
        seed = Seed(self._tmp.name, resources)
        return vr.validate(seed.dir)

    def assertError(self, errors, fragment):
        self.assertTrue(any(fragment in e for e in errors), f"no error containing {fragment!r} in {errors}")

    def valid(self):
        return {"roadmaps": {"git-path": {"sources": [source()]}}, "modules": {"git-basics": {"topics": [topic()]}}}

    def test_a_valid_file_passes_and_counts_topics_and_sources(self):
        result = self.run_with(self.valid())
        self.assertEqual([], result.errors)
        self.assertEqual(1, result.topics)
        self.assertEqual(2, result.sources)

    def test_roadmaps_and_modules_must_exist_in_the_catalog(self):
        data = self.valid()
        data["roadmaps"]["ghost-path"] = {"sources": [source()]}
        data["modules"]["ghost-module"] = {"topics": [topic()]}
        errors = self.run_with(data).errors
        self.assertError(errors, "roadmap ghost-path is not in roadmaps.json")
        self.assertError(errors, "module ghost-module is not in modules.json")

    def test_a_source_needs_title_https_url_known_type_and_language(self):
        data = self.valid()
        data["modules"]["git-basics"]["topics"][0]["sources"] = [
            source(url="http://insecure.example"), source(url="https://a.example/x", type="blog"), source(url="https://b.example/x", language="fr"),
            source(url="https://c.example/x", title=" "),
        ]
        errors = self.run_with(data).errors
        self.assertError(errors, "url must be https")
        self.assertError(errors, "unknown type 'blog'")
        self.assertError(errors, "unknown language 'fr'")
        self.assertError(errors, "title is empty")

    def test_topic_names_and_notes_exist_in_english_and_portuguese(self):
        data = self.valid()
        data["modules"]["git-basics"]["topics"][0]["name"] = {"en": "Basics"}
        data["modules"]["git-basics"]["topics"][0]["sources"] = [source(note={"en": "Why"})]
        errors = self.run_with(data).errors
        self.assertError(errors, "name needs en and pt-BR")
        self.assertError(errors, "note needs en and pt-BR")

    def test_a_topic_needs_sources_and_unique_keys_and_urls(self):
        data = self.valid()
        data["modules"]["git-basics"]["topics"] = [topic("a", []), topic("a"), topic("b", [source(), source()])]
        errors = self.run_with(data).errors
        self.assertError(errors, "has no sources")
        self.assertError(errors, "duplicate topic key 'a'")
        self.assertError(errors, "duplicate url")

    def test_every_roadmap_module_may_be_left_without_resources_but_is_reported(self):
        result = self.run_with(self.valid())
        self.assertEqual([], result.missing_roadmaps)
        data = {"roadmaps": {}, "modules": {}}
        result = self.run_with(data)
        self.assertEqual(["git-path"], result.missing_roadmaps)
        self.assertEqual(["git-basics", "git-extra"], result.missing_modules)

    def test_source_types_are_the_ones_the_ui_has_badges_for(self):
        self.assertEqual({"official-docs", "article", "book", "course", "video", "spec"}, set(vr.TYPES))


class RepositoryResourcesTests(unittest.TestCase):
    def test_the_resources_file_in_the_repository_is_valid(self):
        result = vr.validate()
        self.assertEqual([], result.errors)
        self.assertGreater(result.sources, 0)

    def test_every_roadmap_and_module_has_study_resources(self):
        result = vr.validate()
        self.assertEqual([], result.missing_roadmaps, "roadmaps without study resources")
        self.assertEqual([], result.missing_modules, "modules without study resources")


if __name__ == "__main__":
    unittest.main()
