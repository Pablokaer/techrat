--[[--
One practice session on the Kindle: the current question with lettered options, answering it, moving on and the
summary at the end. The server keeps the session and grades the answers (ADR-0007); this module only remembers where
the learner is, so the screens in main.lua stay simple.

Works with any object that has `startPractice(request)`, `startDailyChallenge()` and
`answer(session, question, option, seconds)`, like techrat_api.
]]
local Game = {}
Game.__index = Game

local LETTERS = { "A", "B", "C", "D", "E", "F" }

local function firstUnanswered(questions)
    for i, q in ipairs(questions) do
        if type(q.answer) ~= "table" then return i end
    end
    return #questions + 1
end

local function fromSession(api, session)
    local questions = type(session.questions) == "table" and session.questions or {}
    return setmetatable({
        api = api,
        session = session,
        questions = questions,
        position = firstUnanswered(questions),
        last = nil,
    }, Game)
end

--- Starts a session (`request` as POST /practice/sessions takes it). Returns the game, or nil and the error kind.
function Game.start(api, request)
    local session, err = api:startPractice(request)
    if not session then return nil, err end
    return fromSession(api, session)
end

--- Starts (or resumes) today's daily challenge.
function Game.startDaily(api)
    local session, err = api:startDailyChallenge()
    if not session then return nil, err end
    return fromSession(api, session)
end

--- The question to answer now: number, total, title, text, topic and options { letter, text, id }. Nil when done.
function Game:current()
    local q = self.questions[self.position]
    if not q then return nil end
    local options = {}
    for i, o in ipairs(q.options or {}) do options[i] = { letter = LETTERS[i] or tostring(i), text = o.text, id = o.id } end
    return {
        number = self.position,
        total = #self.questions,
        title = q.title,
        text = q.questionText,
        topic = q.topicName,
        xp = q.xpReward,
        options = options,
    }
end

--- Answers the current question with option number `index`. Returns the feedback, or nil and the error kind (the
--- question stays current, so it can be answered again).
function Game:answer(index, seconds)
    local q = self.questions[self.position]
    local option = q and q.options and q.options[index]
    if not option then return nil, "invalid" end
    local result, err = self.api:answer(self.session.id, q.id, option.id, seconds)
    if not result then return nil, err end
    self.last = result
    q.answer = result.feedback or {}
    local fb = result.feedback or {}
    local correct_letter, correct_text
    for i, o in ipairs(q.options) do
        if o.id == fb.correctOptionId then correct_letter, correct_text = LETTERS[i] or tostring(i), o.text end
    end
    return {
        correct = fb.isCorrect == true,
        correct_letter = correct_letter,
        correct_text = correct_text,
        explanation = type(fb.explanation) == "string" and fb.explanation or "",
        xp = tonumber(fb.xpEarned) or 0,
        total_xp = tonumber(result.totalXp) or 0,
        level = type(result.level) == "table" and tonumber(result.level.level) or 0,
        streak = tonumber(result.currentStreak) or 0,
    }
end

--- Moves to the next unanswered question. False when the session is over.
function Game:next()
    self.position = firstUnanswered(self.questions)
    return self.questions[self.position] ~= nil
end

--- What the session added up to, from the server's last answer.
function Game:summary()
    local r = self.last or {}
    local s = type(r.session) == "table" and r.session or {}
    return {
        answered = tonumber(s.answered) or 0,
        total = tonumber(s.total) or #self.questions,
        correct = tonumber(s.correct) or 0,
        xp = tonumber(s.xpEarned) or 0,
        total_xp = tonumber(r.totalXp) or 0,
        level = type(r.level) == "table" and tonumber(r.level.level) or 0,
        streak = tonumber(r.currentStreak) or 0,
    }
end

return Game
