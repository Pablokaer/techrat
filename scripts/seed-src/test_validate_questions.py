"""Tests for validate_questions.py. Run: python3 -m unittest discover -s scripts/seed-src -p "test_*.py" """
import json
import os
import tempfile
import unittest

import validate_questions as vq


def question(qid, correct=0, options=None, topic="git", subtopic="basics", difficulty="Easy"):
    return {
        "id": qid, "topic": topic, "subtopic": subtopic, "difficulty": difficulty,
        "title": f"Title {qid}", "question": f"Which statement about {qid} is true?",
        "options": options or ["Alpha one", "Bravo two", "Charl three", "Delta four"],
        "correctIndex": correct,
        "explanation": "Explains why the correct option is right and the distractors are wrong.",
        "referenceUrl": "https://git-scm.com/docs",
    }


def translation(q, options=None):
    return {
        "id": q["id"], "title": f"Título {q['id']}", "question": f"Qual afirmação sobre {q['id']} é verdadeira?",
        "options": options or ["Alfa um", "Beta um", "Gama um", "Zeta um"],
        "explanation": "Explica por que a opção correta está certa e as outras estão erradas.",
    }


class Seed:
    def __init__(self, tmp):
        self.dir = tmp
        os.makedirs(os.path.join(tmp, "questions"))
        os.makedirs(os.path.join(tmp, "i18n", "questions"))
        self.write("topics.json", [{"slug": "git", "subtopics": [{"slug": "basics"}]}])

    def write(self, rel, data):
        path = os.path.join(self.dir, rel)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)
        return path

    def group(self, name, questions, translations=None):
        path = self.write(f"questions/{name}.json", questions)
        tr = [translation(q) for q in questions] if translations is None else translations
        self.write(f"i18n/questions/{name}.pt-BR.json", tr)
        return path


def balanced(prefix, n=4):
    return [question(f"{prefix}-{i}", correct=i % 4) for i in range(n)]


class ValidateQuestionsTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.seed = Seed(self._tmp.name)

    def tearDown(self):
        self._tmp.cleanup()

    def run_all(self):
        return vq.validate(vq.question_files(self.seed.dir), self.seed.dir)

    def assertError(self, result, fragment):
        self.assertTrue(any(fragment in e for e in result.errors), f"no error containing {fragment!r} in {result.errors}")

    def test_valid_bilingual_set_passes(self):
        self.seed.group("git", balanced("git"))
        result = self.run_all()
        self.assertEqual([], result.errors)
        self.assertEqual(4, result.total)

    def test_existing_rules_still_apply(self):
        qs = balanced("git")
        qs[1]["id"] = qs[0]["id"]
        qs[2]["topic"] = "nope"
        self.seed.group("git", qs)
        result = self.run_all()
        self.assertError(result, "duplicate id")
        self.assertError(result, "unknown topic")

    def test_every_question_needs_a_portuguese_translation(self):
        qs = balanced("git")
        self.seed.group("git", qs, translations=[translation(q) for q in qs[:3]])
        self.assertError(self.run_all(), "git-3: missing pt-BR translation")

    def test_translation_must_have_four_options_and_no_empty_text(self):
        qs = balanced("git")
        tr = [translation(q) for q in qs]
        tr[0]["options"] = ["a", "b", "c"]
        tr[1]["explanation"] = "  "
        self.seed.group("git", qs, translations=tr)
        result = self.run_all()
        self.assertError(result, "git-0: pt-BR translation needs exactly 4 options")
        self.assertError(result, "git-1: pt-BR translation has an empty explanation")

    def test_orphan_translations_are_reported_when_validating_everything(self):
        qs = balanced("git")
        self.seed.group("git", qs, translations=[translation(q) for q in qs] + [translation(question("ghost"))])
        self.assertError(self.run_all(), "ghost: pt-BR translation for an unknown question")

    def test_file_fails_when_the_correct_option_is_usually_the_longest(self):
        long_correct = ["The correct and clearly longest option", "Short", "Brief", "Tiny"]
        qs = [question(f"git-{i}", correct=0, options=list(long_correct)) for i in range(2)] + balanced("ok", 2)
        self.seed.group("git", qs)
        result = self.run_all()
        self.assertError(result, "git.json: correct option is the longest in 2/4 questions (50%)")

    def test_portuguese_options_are_checked_for_the_same_bias(self):
        qs = balanced("git")
        tr = [translation(q) for q in qs]
        for t, q in zip(tr[:2], qs[:2]):
            t["options"] = ["Curta", "Breve", "Mini", "Nano"]
            t["options"][q["correctIndex"]] = "A opção correta e claramente a mais longa"
        self.seed.group("git", qs, translations=tr)
        self.assertError(self.run_all(), "git.pt-BR.json: correct option is the longest in 2/4 questions (50%)")

    def test_reports_the_global_longest_ratio(self):
        self.seed.group("git", balanced("git"))
        result = self.run_all()
        self.assertIn("longest_ratio", result.stats)
        self.assertIn("pt_longest_ratio", result.stats)


if __name__ == "__main__":
    unittest.main()
