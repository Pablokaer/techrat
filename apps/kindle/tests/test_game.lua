local Game = require("techrat_game")

local tests = {}

local function question(id, answered)
    return {
        id = id, title = "Title " .. id, questionText = "Text " .. id, topicName = "Kubernetes", xpReward = 25, difficulty = "Medium",
        options = { { id = id .. "a", text = "One" }, { id = id .. "b", text = "Two" }, { id = id .. "c", text = "Three" }, { id = id .. "d", text = "Four" } },
        answer = answered and { isCorrect = true } or nil,
    }
end

--- An API double: a session of the given questions and scripted answer results.
local function api(questions, results)
    local a = { sent = {} }
    function a:startPractice(req)
        self.started = req
        return { id = "S1", totalQuestions = #questions, questions = questions }
    end
    function a:answer(session, q, option, seconds)
        self.sent[#self.sent + 1] = { session = session, question = q, option = option, seconds = seconds }
        local r = table.remove(results, 1)
        if type(r) == "string" then return nil, r end
        return r
    end
    return a
end

local function result(correct, correct_id, answered, total, right, xp)
    return {
        feedback = { isCorrect = correct, correctOptionId = correct_id, explanation = "Because.", xpEarned = correct and 25 or 0 },
        totalXp = 540, level = { level = 3, progressPercent = 25, xpToNextLevel = 150 }, currentStreak = 4,
        session = { answered = answered, total = total, correct = right, xpEarned = xp, isComplete = answered == total },
    }
end

function tests.the_first_question_is_shown_with_lettered_options(t)
    local game = Game.start(api({ question("Q1"), question("Q2") }, {}), { mode = "Practice", topicSlug = "kubernetes", count = 2 })
    local q = game:current()
    t.eq({ q.number, q.total, q.title, q.text, q.topic, q.difficulty }, { 1, 2, "Title Q1", "Text Q1", "Kubernetes", "Medium" }, "question")
    t.eq(q.options[2], { letter = "B", text = "Two", id = "Q1b" }, "option B")
end

function tests.an_answer_reports_the_right_option_the_explanation_and_the_xp(t)
    local a = api({ question("Q1"), question("Q2") }, { result(false, "Q1c", 1, 2, 0, 0) })
    local game = Game.start(a, { mode = "Practice" })
    local fb = game:answer(1, 9)
    t.eq(a.sent[1], { session = "S1", question = "Q1", option = "Q1a", seconds = 9 }, "sent")
    t.eq({ fb.correct, fb.correct_letter, fb.correct_text, fb.explanation, fb.xp }, { false, "C", "Three", "Because.", 0 }, "feedback")
    t.eq({ fb.total_xp, fb.level, fb.streak }, { 540, 3, 4 }, "progress")
end

function tests.the_session_moves_on_and_ends_with_a_summary(t)
    local game = Game.start(api({ question("Q1"), question("Q2") }, { result(true, "Q1a", 1, 2, 1, 25), result(true, "Q2a", 2, 2, 2, 50) }), {})
    game:answer(1, 5)
    t.ok(game:next(), "a second question")
    t.eq(game:current().number, 2, "second")
    game:answer(1, 5)
    t.ok(not game:next(), "no third question")
    t.eq(game:summary(), { answered = 2, total = 2, correct = 2, xp = 50, total_xp = 540, level = 3, streak = 4,
        level_progress = 0.25, xp_to_next = 150 }, "summary")
end

function tests.a_session_resumes_at_the_first_unanswered_question(t)
    local game = Game.start(api({ question("Q1", true), question("Q2") }, {}), {})
    t.eq(game:current().title, "Title Q2", "resumed")
    t.eq(game:current().number, 2, "position")
end

function tests.a_failed_answer_keeps_the_question_so_it_can_be_retried(t)
    local game = Game.start(api({ question("Q1") }, { "network" }), {})
    t.eq({ game:answer(2, 3) }, { nil, "network" }, "error")
    t.eq(game:current().title, "Title Q1", "same question")
end

function tests.starting_reports_the_error_of_the_api(t)
    local a = { startPractice = function() return nil, "auth" end }
    t.eq({ Game.start(a, {}) }, { nil, "auth" }, "error")
end

return tests
