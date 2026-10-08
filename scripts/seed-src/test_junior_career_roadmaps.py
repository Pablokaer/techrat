"""Tests for the junior job-search roadmaps: interview preparation and the first 90 days (both heavy on SOLID and TDD).

Run: python3 -m unittest discover -s scripts/seed-src -p "test_*.py"
"""
import glob
import json
import os
import unittest
from collections import Counter

from modules import MODULES
from roadmaps import build

DATA = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend/TechRat.Infrastructure/Seed/Data"))

# The rule behind the numbers: a step needs 5 distinct questions, and learners should not exhaust a scope on the first pass.
MIN_QUESTIONS_PER_SCOPE = 8

SOLID_TDD_MODULES = ["solid-in-practice", "tdd-fundamentals", "tdd-in-practice"]
INTERVIEW_MODULES = ["behavioral-interview", "junior-technical-interview"]
FIRST_JOB_MODULES = ["onboarding-and-first-90-days", "pull-requests-for-juniors"]

INTERVIEW = "junior-interview-preparation"
FIRST_90 = "first-90-days"


def roadmaps():
    return {r["slug"]: r for r in build()}


def required(roadmap):
    return {m["slug"] for m in roadmap["modules"] if m["required"]}


def optional(roadmap):
    return {m["slug"] for m in roadmap["modules"] if not m["required"]}


def questions():
    out = []
    for path in glob.glob(os.path.join(DATA, "questions", "*.json")):
        with open(path, encoding="utf-8") as f:
            out += json.load(f)
    return out


def scopes_of(module_slugs):
    mods = {m["slug"]: m for m in MODULES}
    return [tuple(step.split("|")[0].split("/")) for slug in module_slugs for step in mods[slug]["steps"]]


class JuniorInterviewPreparationTests(unittest.TestCase):
    def test_is_a_skill_track_for_the_first_job_search(self):
        r = roadmaps()[INTERVIEW]
        self.assertEqual("SkillTrack", r["type"])
        self.assertEqual("Career", r["category"])

    def test_covers_both_interview_modules_and_the_existing_beginner_drills(self):
        r = roadmaps()[INTERVIEW]
        self.assertLessEqual(set(INTERVIEW_MODULES) | {"arrays-strings-hashing", "array-patterns", "sql-foundations"}, required(r))

    def test_is_heavy_on_solid_and_tdd(self):
        self.assertLessEqual(set(SOLID_TDD_MODULES), required(roadmaps()[INTERVIEW]))

    def test_leaves_out_heavy_graph_and_dynamic_programming_work(self):
        slugs = required(roadmaps()[INTERVIEW]) | optional(roadmaps()[INTERVIEW])
        self.assertFalse(slugs & {"graph-basics", "backtracking-and-dp", "advanced-graph-algorithms", "greedy-and-intervals"})


class FirstNinetyDaysTests(unittest.TestCase):
    def test_is_a_skill_track_for_people_who_just_got_hired(self):
        r = roadmaps()[FIRST_90]
        self.assertEqual("SkillTrack", r["type"])
        self.assertEqual("Career", r["category"])

    def test_covers_onboarding_and_pull_requests(self):
        self.assertLessEqual(set(FIRST_JOB_MODULES), required(roadmaps()[FIRST_90]))

    def test_is_heavy_on_solid_and_tdd(self):
        self.assertLessEqual(set(SOLID_TDD_MODULES), required(roadmaps()[FIRST_90]))

    def test_offers_code_review_and_mentoring_as_an_optional_next_step(self):
        self.assertIn("code-review-and-mentoring", optional(roadmaps()[FIRST_90]))


class SharedModulesTests(unittest.TestCase):
    def test_solid_and_tdd_modules_are_shared_by_both_roadmaps(self):
        mods = {m["slug"]: m for m in MODULES}
        for slug in SOLID_TDD_MODULES:
            self.assertEqual("Core", mods[slug]["kind"], slug)

    def test_career_modules_belong_to_one_roadmap_each(self):
        mods = {m["slug"]: m for m in MODULES}
        for slug in INTERVIEW_MODULES + FIRST_JOB_MODULES:
            self.assertEqual("Context", mods[slug]["kind"], slug)

    def test_solid_and_tdd_have_eleven_or_more_steps_between_them(self):
        mods = {m["slug"]: m for m in MODULES}
        self.assertGreaterEqual(sum(len(mods[s]["steps"]) for s in SOLID_TDD_MODULES), 11)


class QuestionVolumeTests(unittest.TestCase):
    """The content behind the new modules: every scope is stocked in both languages (CLAUDE.md)."""

    def test_every_new_scope_has_enough_questions(self):
        counts = Counter((q["topic"], q["subtopic"]) for q in questions())
        short = {f"{t}/{s}": counts[(t, s)] for t, s in scopes_of(SOLID_TDD_MODULES + INTERVIEW_MODULES + FIRST_JOB_MODULES)
                 if counts[(t, s)] < MIN_QUESTIONS_PER_SCOPE}
        self.assertEqual({}, short)

    def test_solid_and_tdd_have_plenty_of_practice_questions(self):
        counts = Counter((q["topic"], q["subtopic"]) for q in questions())
        total = sum(counts[scope] for scope in scopes_of(SOLID_TDD_MODULES))
        self.assertGreaterEqual(total, 88)

    def test_each_step_has_questions_at_its_own_difficulty_for_the_ramp(self):
        """DifficultyRamp: the first half of a module's steps sits at the entry difficulty, the second half one above."""
        entry = {"Beginner": 0, "Intermediate": 1, "Advanced": 2, "Expert": 3}
        names = ["Easy", "Medium", "Hard", "Expert"]
        by_scope = Counter((q["topic"], q["subtopic"], q["difficulty"]) for q in questions())
        mods = {m["slug"]: m for m in MODULES}
        weak = []
        for slug in SOLID_TDD_MODULES + INTERVIEW_MODULES + FIRST_JOB_MODULES:
            steps = mods[slug]["steps"]
            for i, step in enumerate(steps):
                topic, sub = step.split("|")[0].split("/")
                position = 0 if len(steps) <= 1 else i / (len(steps) - 1)
                level = min(3, entry[mods[slug]["level"]] + (1 if position >= 0.5 else 0))
                if by_scope[(topic, sub, names[level])] < 5:
                    weak.append(f"{topic}/{sub} needs 5 {names[level]}")
        self.assertEqual([], weak)


if __name__ == "__main__":
    unittest.main()
