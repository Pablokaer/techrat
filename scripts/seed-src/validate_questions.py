"""Validates question seed files and their pt-BR translations.

Usage: python3 scripts/seed-src/validate_questions.py [file ...]
With no args validates every file in backend/TechRat.Infrastructure/Seed/Data/questions.
Exit code 1 when any error is found.

Rules (see QUESTION_AUTHORING.md):
- schema, 4 distinct options, exactly one correct, valid topic/subtopic, https reference, unique ids and texts;
- every question has a pt-BR translation in Seed/Data/i18n/questions/<group>.pt-BR.json
  (same id, title, question, 4 options in the same order, explanation);
- answer-length bias: in each file (English and Portuguese) the correct option may be the strictly longest
  option in at most 35% of the questions.
"""
import collections
import glob
import json
import os
import re
import sys
from dataclasses import dataclass, field

DEFAULT_DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend/TechRat.Infrastructure/Seed/Data"))
DIFFS = {"Easy", "Medium", "Hard", "Expert"}
KEYS = {"id", "topic", "subtopic", "difficulty", "title", "question", "options", "correctIndex", "explanation", "referenceUrl"}
TRANSLATION_KEYS = {"id", "title", "question", "options", "explanation"}
LOCALE = "pt-BR"
MAX_LONGEST_RATIO = 0.35


@dataclass
class Result:
    errors: list = field(default_factory=list)
    total: int = 0
    stats: dict = field(default_factory=dict)


def question_files(data_dir=DEFAULT_DATA_DIR):
    return sorted(glob.glob(os.path.join(data_dir, "questions", "*.json")))


def translation_files(data_dir=DEFAULT_DATA_DIR):
    return sorted(glob.glob(os.path.join(data_dir, "i18n", "questions", f"*.{LOCALE}.json")))


def norm(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


def correct_is_longest(options, correct_index):
    """True when the correct option is strictly longer than every other option."""
    lens = [len(o) for o in options]
    return 0 <= correct_index < len(lens) and lens[correct_index] == max(lens) and lens.count(max(lens)) == 1


def _load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _bias_error(name, longest, count):
    if count and longest / count > MAX_LONGEST_RATIO:
        return f"{name}: correct option is the longest in {longest}/{count} questions ({longest / count:.0%}); keep it <= {MAX_LONGEST_RATIO:.0%}"
    return None


def validate(files, data_dir=DEFAULT_DATA_DIR):
    """Validates the given question files against the topics and the pt-BR translations under data_dir."""
    result = Result()
    errors = result.errors
    topics = _load(os.path.join(data_dir, "topics.json"))
    valid = {t["slug"]: {s["slug"] for s in t["subtopics"]} for t in topics}
    validating_all = {os.path.abspath(f) for f in files} == {os.path.abspath(f) for f in question_files(data_dir)}

    translations, translation_file_of = {}, {}
    for tf in translation_files(data_dir):
        try:
            data = _load(tf)
        except Exception as e:
            errors.append(f"{os.path.basename(tf)}: invalid JSON: {e}")
            continue
        for t in data if isinstance(data, list) else []:
            if isinstance(t, dict) and "id" in t:
                translations[t["id"]] = t
                translation_file_of[t["id"]] = os.path.basename(tf)

    seen_ids, seen_text = {}, {}
    per_diff, per_topic, correct_pos = collections.Counter(), collections.Counter(), collections.Counter()
    longest_total = pt_longest_total = pt_total = 0

    for f in files:
        name = os.path.basename(f)
        try:
            data = _load(f)
        except Exception as e:
            errors.append(f"{name}: invalid JSON: {e}")
            continue
        if not isinstance(data, list):
            errors.append(f"{name}: root must be a list")
            continue

        file_longest = file_pt_longest = file_pt_count = file_count = 0
        for i, q in enumerate(data):
            where = f"{name}[{i}] {q.get('id', '?')}"
            result.total += 1
            missing = KEYS - set(q)
            extra = set(q) - KEYS
            if missing:
                errors.append(f"{where}: missing {sorted(missing)}")
            if extra:
                errors.append(f"{where}: unexpected keys {sorted(extra)}")
            if missing:
                continue
            if not re.fullmatch(r"[a-z0-9-]+", q["id"]):
                errors.append(f"{where}: id must be kebab-case")
            if q["id"] in seen_ids:
                errors.append(f"{where}: duplicate id (also in {seen_ids[q['id']]})")
            seen_ids[q["id"]] = name
            if q["topic"] not in valid:
                errors.append(f"{where}: unknown topic {q['topic']}")
            elif q["subtopic"] not in valid[q["topic"]]:
                errors.append(f"{where}: unknown subtopic {q['topic']}/{q['subtopic']}")
            if q["difficulty"] not in DIFFS:
                errors.append(f"{where}: bad difficulty {q['difficulty']}")
            opts = q["options"]
            if not isinstance(opts, list) or len(opts) != 4:
                errors.append(f"{where}: needs exactly 4 options")
            elif len({norm(o) for o in opts}) != 4:
                errors.append(f"{where}: duplicate options")
            elif any(not str(o).strip() for o in opts):
                errors.append(f"{where}: empty option")
            if q["correctIndex"] not in (0, 1, 2, 3):
                errors.append(f"{where}: correctIndex must be 0..3")
            if not str(q["referenceUrl"]).startswith("https://"):
                errors.append(f"{where}: referenceUrl must be https")
            if len(q["question"]) < 20:
                errors.append(f"{where}: question too short")
            if len(q["explanation"]) < 40:
                errors.append(f"{where}: explanation too short")
            if len(q["title"]) > 80:
                errors.append(f"{where}: title longer than 80 chars")
            key = norm(q["question"])
            if key in seen_text:
                errors.append(f"{where}: duplicate question text (also {seen_text[key]})")
            seen_text[key] = q["id"]
            per_diff[q["difficulty"]] += 1
            per_topic[q["topic"]] += 1
            correct_pos[q["correctIndex"]] += 1
            file_count += 1
            if isinstance(opts, list) and correct_is_longest(opts, q["correctIndex"]):
                file_longest += 1

            # pt-BR translation -------------------------------------------------
            t = translations.get(q["id"])
            if t is None:
                errors.append(f"{q['id']}: missing {LOCALE} translation")
                continue
            if set(t) != TRANSLATION_KEYS:
                errors.append(f"{q['id']}: {LOCALE} translation keys must be {sorted(TRANSLATION_KEYS)}")
                continue
            t_opts = t["options"]
            if not isinstance(t_opts, list) or len(t_opts) != 4:
                errors.append(f"{q['id']}: {LOCALE} translation needs exactly 4 options")
                continue
            for k in ("title", "question", "explanation"):
                if not str(t[k]).strip():
                    errors.append(f"{q['id']}: {LOCALE} translation has an empty {k}")
            if any(not str(o).strip() for o in t_opts):
                errors.append(f"{q['id']}: {LOCALE} translation has an empty option")
            elif len({norm(o) for o in t_opts}) != 4:
                errors.append(f"{q['id']}: {LOCALE} translation has duplicate options")
            if len(t["title"]) > 120:
                errors.append(f"{q['id']}: {LOCALE} title longer than 120 chars")
            file_pt_count += 1
            if correct_is_longest(t_opts, q["correctIndex"]):
                file_pt_longest += 1

        for err in (_bias_error(name, file_longest, file_count),
                    _bias_error(name.replace(".json", f".{LOCALE}.json"), file_pt_longest, file_pt_count)):
            if err:
                errors.append(err)
        longest_total += file_longest
        pt_longest_total += file_pt_longest
        pt_total += file_pt_count

    if validating_all:
        for tid in sorted(set(translations) - set(seen_ids)):
            errors.append(f"{tid}: {LOCALE} translation for an unknown question ({translation_file_of[tid]})")

    counted = sum(per_diff.values())
    result.stats = {
        "by_difficulty": dict(per_diff),
        "by_topic": dict(per_topic),
        "correct_index": dict(sorted(correct_pos.items())),
        "longest_ratio": longest_total / counted if counted else 0.0,
        "pt_longest_ratio": pt_longest_total / pt_total if pt_total else 0.0,
        "translated": pt_total,
    }
    return result


def main(argv):
    files = argv or question_files()
    result = validate(files)
    s = result.stats
    print(f"files={len(files)} questions={result.total} translated({LOCALE})={s['translated']}")
    print("by difficulty:", s["by_difficulty"])
    print("correctIndex distribution:", s["correct_index"])
    print(f"correct option is the longest: en={s['longest_ratio']:.0%} {LOCALE}={s['pt_longest_ratio']:.0%} (max {MAX_LONGEST_RATIO:.0%} per file)")
    if not argv:
        topics = _load(os.path.join(DEFAULT_DATA_DIR, "topics.json"))
        for t in topics:
            print(f"  {t['slug']:28s} {s['by_topic'].get(t['slug'], 0)}")
    for e in result.errors[:200]:
        print("ERROR", e)
    if len(result.errors) > 200:
        print(f"... and {len(result.errors) - 200} more")
    print(f"{len(result.errors)} error(s)")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
