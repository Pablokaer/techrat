--[[
Loads the real main.lua with stand-ins for the KOReader modules it uses and plays through it, so a mistake in the
screens (a nil field, a wrong callback) fails here instead of on the Kindle. The stand-ins keep what was shown and
let the test press buttons; the network is a scripted fake of the TechRat API.
]]
local tests = {}

local function harness(responses)
    local shown, requests, settings_data = {}, {}, {}
    local function widget(kind)
        return { new = function(_, o) o.kind = kind; return o end }
    end
    local stubs = {
        ["datastorage"] = { getSettingsDir = function() return "/tmp" end },
        ["luasettings"] = { open = function()
            return {
                readSetting = function(_, k, default) if settings_data[k] == nil then return default end return settings_data[k] end,
                saveSetting = function(_, k, v) settings_data[k] = v end,
                delSetting = function(_, k) settings_data[k] = nil end,
                flush = function() end,
            }
        end },
        ["ui/widget/buttondialog"] = widget("ButtonDialog"),
        ["ui/widget/infomessage"] = widget("InfoMessage"),
        ["ui/widget/menu"] = widget("Menu"),
        ["ui/widget/textviewer"] = widget("TextViewer"),
        ["ui/widget/multiinputdialog"] = { new = function(_, o)
            o.kind = "MultiInputDialog"
            o.getFields = function() return o.typed end
            o.onShowKeyboard = function() end
            return o
        end },
        ["ui/network/manager"] = { runWhenOnline = function(_, fn) fn() end },
        ["ui/uimanager"] = { show = function(_, w) shown[#shown + 1] = w end, close = function() end },
        ["ui/widget/container/widgetcontainer"] = { extend = function(_, class)
            class.new = function(cls, o)
                local obj = setmetatable(o or {}, { __index = cls })
                obj:init()
                return obj
            end
            return class
        end },
        ["gettext"] = { current_lang = "pt_BR" },
        ["techrat_transport"] = function(req)
            local path = req.url:gsub("^https://techrat%.io", "")
            requests[#requests + 1] = { method = req.method, path = path, body = req.body }
            local queue = responses[req.method .. " " .. path]
            local resp = queue and table.remove(queue, 1)
            if not resp then return nil, nil, "unexpected request " .. req.method .. " " .. path end
            return resp[1], resp[2]
        end,
    }
    for name, module in pairs(stubs) do
        package.loaded[name] = module
    end
    package.loaded["main"] = nil
    local TechRat = dofile((package.path:match("([^;]*)techrat%.koplugin/%?%.lua") or "") .. "techrat.koplugin/main.lua")
    local plugin = TechRat:new{ ui = { menu = { registerToMainMenu = function() end } } }
    local h = { plugin = plugin, shown = shown, requests = requests, settings = settings_data }
    function h.last() return shown[#shown] end
    function h.button(w, label)
        for _, row in ipairs(w.buttons_table or w.buttons or {}) do
            for _, b in ipairs(row) do if b.text == label then return b end end
        end
        error("no button '" .. label .. "' in " .. tostring(w.kind) .. " (" .. tostring(w.title) .. ")", 2)
    end
    function h.item(items, label)
        for _, it in ipairs(items) do if it.text == label then return it end end
        error("no item '" .. label .. "'", 2)
    end
    return h
end

local function question(id)
    return { id = id, title = "Pods", questionText = "What runs containers?", topicName = "Kubernetes", xpReward = 25,
        options = { { id = id .. "a", text = "A pod" }, { id = id .. "b", text = "A node" } } }
end

function tests.a_learner_signs_in_picks_a_topic_and_plays_a_session_in_portuguese(t)
    local h = harness({
        ["POST /api/v1/auth/login"] = { { 200, { accessToken = "A", refreshToken = "R", expiresIn = 1800 } } },
        ["GET /api/v1/users/me"] = { { 200, { username = "rat", displayName = "Rato" } } },
        ["GET /api/v1/topics"] = { { 200, { { slug = "kubernetes", name = "Kubernetes", questions = { total = 30 } } } } },
        ["POST /api/v1/practice/sessions"] = { { 200, { id = "S1", totalQuestions = 1, questions = { question("Q1") } } } },
        ["POST /api/v1/practice/sessions/S1/answers"] = { { 200, {
            feedback = { isCorrect = false, correctOptionId = "Q1a", explanation = "Pods run containers.", xpEarned = 0 },
            totalXp = 120, level = { level = 2 }, currentStreak = 3,
            session = { answered = 1, total = 1, correct = 0, xpEarned = 0, isComplete = true },
        } } },
    })

    -- Signed out, the menu only offers to sign in.
    local menu = h.plugin:menuItems()
    t.eq(#menu, 1, "one item")
    menu[1].callback()
    local dialog = h.last()
    t.eq(dialog.kind, "MultiInputDialog", "sign-in dialog")
    dialog.typed = { "  me@x.io ", "pw" }
    h.button(dialog, "Entrar").callback()
    t.eq(h.requests[1].body, { email = "me@x.io", password = "pw" }, "trimmed email sent")
    t.eq(h.last().text, "Conectado como Rato", "welcome")
    t.ok(h.settings.tokens, "tokens kept")

    -- Topics, then how many questions.
    h.item(h.plugin:menuItems(), "Temas").callback()
    local list = h.last()
    t.eq({ list.kind, list.item_table[1].mandatory }, { "Menu", "30 questões" }, "topic list")
    list.item_table[1].callback()
    h.button(h.last(), "5").callback()
    t.eq(h.requests[#h.requests].body, { mode = "Practice", topicSlug = "kubernetes", count = 5 }, "session request")

    -- The question, answered wrong.
    local viewer = h.last()
    t.eq(viewer.kind, "TextViewer", "question screen")
    t.ok(viewer.text:find("Questão 1 de 1", 1, true) and viewer.text:find("B) A node", 1, true), "question text")
    h.button(viewer, "B").callback()
    t.eq(h.requests[#h.requests].body.selectedOptionId, "Q1b", "answer sent")
    local feedback = h.last()
    t.eq(feedback.title, "Não foi dessa vez.", "feedback title")
    t.ok(feedback.text:find("Resposta correta: A) A pod", 1, true) and feedback.text:find("Pods run containers.", 1, true), "feedback text")

    -- The end of the session.
    h.button(feedback, "Ver resultado").callback()
    t.eq(h.last().text, "Sessão concluída\n\n0 de 1 corretas · +0 XP\nNível 2 · 120 XP · sequência de 3 dias", "summary")
end

function tests.a_roadmap_not_started_offers_to_start_it_and_a_locked_one_says_why(t)
    local h = harness({
        ["POST /api/v1/auth/login"] = { { 200, { accessToken = "A", refreshToken = "R", expiresIn = 1800 } } },
        ["GET /api/v1/users/me"] = { { 200, { username = "rat" } } },
        ["GET /api/v1/roadmaps/system-design"] = { { 200, { summary = { name = "System Design", progress = { isStarted = false } }, modules = {} } } },
        ["POST /api/v1/roadmaps/system-design/start"] = { { 403, {} } },
    })
    h.plugin:menuItems()[1].callback()
    h.last().typed = { "me@x.io", "pw" }
    h.button(h.last(), "Entrar").callback()

    h.plugin:showRoadmap("system-design")
    h.button(h.last(), "Começar este roadmap").callback()
    t.eq(h.last().text, "Conclua antes os pré-requisitos deste roadmap em techrat.io.", "locked message")
end

function tests.a_started_roadmap_lets_only_the_current_step_be_practised(t)
    local h = harness({
        ["POST /api/v1/auth/login"] = { { 200, { accessToken = "A", refreshToken = "R", expiresIn = 1800 } } },
        ["GET /api/v1/users/me"] = { { 200, { username = "rat" } } },
        ["GET /api/v1/roadmaps/backend"] = { { 200, { summary = { name = "Backend", progress = { isStarted = true } }, modules = {
            { title = "HTTP", steps = { { id = "st1", title = "Verbs", status = "Completed" }, { id = "st2", title = "Caching", status = "Current" } } },
            { title = "DB", steps = { { id = "st3", title = "Indexes", status = "Locked" } } },
        } } } },
        ["POST /api/v1/practice/sessions"] = { { 200, { id = "S2", totalQuestions = 1, questions = { question("Q9") } } } },
    })
    h.plugin:menuItems()[1].callback()
    h.last().typed = { "me@x.io", "pw" }
    h.button(h.last(), "Entrar").callback()

    h.plugin:showRoadmap("backend")
    local items = h.last().item_table
    t.eq({ items[1].mandatory, items[1].select_enabled }, { "concluída", false }, "completed step")
    t.eq({ items[2].mandatory, items[2].select_enabled }, { "atual", true }, "current step")
    t.eq({ items[3].mandatory, items[3].select_enabled }, { "bloqueada", false }, "locked step")
    items[2].callback()
    t.eq(h.requests[#h.requests].body, { mode = "Roadmap", roadmapStepId = "st2", count = 10 }, "step session")
end

function tests.an_expired_session_asks_to_sign_in_again(t)
    local h = harness({
        ["POST /api/v1/auth/login"] = { { 200, { accessToken = "A", refreshToken = "R", expiresIn = 1800 } } },
        ["GET /api/v1/users/me"] = { { 200, { username = "rat" } } },
        ["GET /api/v1/topics"] = { { 401, {} } },
        ["POST /api/v1/auth/refresh"] = { { 401, {} } },
    })
    h.plugin:menuItems()[1].callback()
    h.last().typed = { "me@x.io", "pw" }
    h.button(h.last(), "Entrar").callback()

    h.item(h.plugin:menuItems(), "Temas").callback()
    t.eq(h.last().text, "Sua sessão do TechRat terminou. Entre de novo.", "message")
    t.eq(h.settings.tokens, nil, "tokens forgotten")
    t.eq(#h.plugin:menuItems(), 1, "back to signing in")
end

return tests
