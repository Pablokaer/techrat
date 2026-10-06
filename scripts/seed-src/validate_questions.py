"""Validates question seed files.

Usage: python3 scripts/seed-src/validate_questions.py [file ...]
With no args validates every file in backend/TechRat.Infrastructure/Seed/Data/questions.
Exit code 1 when any error is found.
"""
import json, os, sys, glob, collections, re

ROOT = os.path.join(os.path.dirname(__file__), "../../backend/TechRat.Infrastructure/Seed/Data")
topics = json.load(open(os.path.join(ROOT, "topics.json")))
valid = {t["slug"]: {s["slug"] for s in t["subtopics"]} for t in topics}
DIFFS = {"Easy", "Medium", "Hard", "Expert"}
KEYS = {"id", "topic", "subtopic", "difficulty", "title", "question", "options", "correctIndex", "explanation", "referenceUrl"}

files = sys.argv[1:] or sorted(glob.glob(os.path.join(ROOT, "questions", "*.json")))
errors, seen_ids, seen_text = [], {}, {}
per_diff, per_topic, correct_pos = collections.Counter(), collections.Counter(), collections.Counter()
total = 0

def norm(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())

for f in files:
    try:
        data = json.load(open(f))
    except Exception as e:
        errors.append(f"{f}: invalid JSON: {e}"); continue
    if not isinstance(data, list):
        errors.append(f"{f}: root must be a list"); continue
    for i, q in enumerate(data):
        where = f"{os.path.basename(f)}[{i}] {q.get('id', '?')}"
        total += 1
        missing = KEYS - set(q)
        extra = set(q) - KEYS
        if missing: errors.append(f"{where}: missing {sorted(missing)}")
        if extra: errors.append(f"{where}: unexpected keys {sorted(extra)}")
        if missing: continue
        if not re.fullmatch(r"[a-z0-9-]+", q["id"]): errors.append(f"{where}: id must be kebab-case")
        if q["id"] in seen_ids: errors.append(f"{where}: duplicate id (also in {seen_ids[q['id']]})")
        seen_ids[q["id"]] = os.path.basename(f)
        if q["topic"] not in valid: errors.append(f"{where}: unknown topic {q['topic']}")
        elif q["subtopic"] not in valid[q["topic"]]: errors.append(f"{where}: unknown subtopic {q['topic']}/{q['subtopic']}")
        if q["difficulty"] not in DIFFS: errors.append(f"{where}: bad difficulty {q['difficulty']}")
        opts = q["options"]
        if not isinstance(opts, list) or len(opts) != 4: errors.append(f"{where}: needs exactly 4 options")
        elif len({norm(o) for o in opts}) != 4: errors.append(f"{where}: duplicate options")
        elif any(not str(o).strip() for o in opts): errors.append(f"{where}: empty option")
        if q["correctIndex"] not in (0, 1, 2, 3): errors.append(f"{where}: correctIndex must be 0..3")
        if not str(q["referenceUrl"]).startswith("https://"): errors.append(f"{where}: referenceUrl must be https")
        if len(q["question"]) < 20: errors.append(f"{where}: question too short")
        if len(q["explanation"]) < 40: errors.append(f"{where}: explanation too short")
        if len(q["title"]) > 80: errors.append(f"{where}: title longer than 80 chars")
        key = norm(q["question"])
        if key in seen_text: errors.append(f"{where}: duplicate question text (also {seen_text[key]})")
        seen_text[key] = q["id"]
        per_diff[q["difficulty"]] += 1
        per_topic[q["topic"]] += 1
        correct_pos[q["correctIndex"]] += 1

print(f"files={len(files)} questions={total}")
print("by difficulty:", dict(per_diff))
print("correctIndex distribution:", dict(sorted(correct_pos.items())))
if not sys.argv[1:]:
    for t in topics:
        print(f"  {t['slug']:28s} {per_topic.get(t['slug'], 0)}")
for e in errors[:200]:
    print("ERROR", e)
print(f"{len(errors)} error(s)")
sys.exit(1 if errors else 0)
