--[[
Loads the real main.lua and plays through it. The screens module (techrat_ui) is replaced by a recorder that keeps
what each screen was asked to show, so a test can read it and "tap" by calling its callbacks; the KOReader modules
main.lua needs are minimal stand-ins, and the network is a scripted fake of the TechRat API. How the screens look is
checked in the KOReader emulator (apps/kindle/dev).
]]
local tests = {}

local function harness(responses, saved, koreader_settings)
    local screens, requests, settings_data = {}, {}, saved or {}
    -- The Kindle's network as KOReader sees it; a test switches it off or leaves it on a Wi-Fi without internet.
    local network = { online = true, connected = true, calls = {} }
    local function record(name)
        return function(vm, extra) screens[#screens + 1] = { screen = name, vm = vm, extra = extra } end
    end
    local ui = {
        home = record("home"), question = record("question"), feedback = record("feedback"), summary = record("summary"),
        list = record("list"), message = record("message"), signIn = record("signIn"), close = record("close"),
        confirm = record("confirm"),
        choose = function(title, options, cancel) screens[#screens + 1] = { screen = "choose", vm = { title = title, options = options, cancel = cancel } } end,
    }
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
        ["ui/network/manager"] = {
            isOnline = function() return network.online end,
            isConnected = function() return network.connected end,
            runWhenOnline = function(_, fn) table.insert(network.calls, "runWhenOnline"); if network.online then fn() end end,
            toggleWifiOn = function(_, fn)
                table.insert(network.calls, "toggleWifiOn")
                network.online, network.connected = true, true
                fn()
            end,
        },
        ["ui/widget/container/widgetcontainer"] = { extend = function(_, class)
            class.new = function(cls, o)
                local obj = setmetatable(o or {}, { __index = cls })
                obj:init()
                return obj
            end
            return class
        end },
        ["gettext"] = { current_lang = "pt_BR" },
        ["techrat_ui"] = ui,
        ["techrat_transport"] = function(req)
            local path = req.url:gsub("^https://techrat%.io", "")
            requests[#requests + 1] = { method = req.method, path = path, body = req.body, language = req.headers["Accept-Language"] }
            local queue = responses[req.method .. " " .. path]
            local resp = queue and table.remove(queue, 1)
            if not resp then return nil, nil, "unexpected request " .. req.method .. " " .. path end
            return resp[1], resp[2]
        end,
    }
    for name, module in pairs(stubs) do package.loaded[name] = module end
    local ko = koreader_settings or {}
    _G.G_reader_settings = { readSetting = function(_, k) return ko[k] end }
    local TechRat = dofile((package.path:match("([^;]*)techrat%.koplugin/%?%.lua") or "") .. "techrat.koplugin/main.lua")
    local plugin = TechRat:new{ ui = { menu = { registerToMainMenu = function() end } } }
    local h = { plugin = plugin, screens = screens, requests = requests, settings = settings_data, network = network }
    function h.last() return screens[#screens] end
    function h.lastRequest() return requests[#requests] end
    function h.open()
        local items = {}
        plugin:addToMainMenu(items)
        items.techrat.callback()
    end
    local function find(list, field, label)
        for _, it in ipairs(list or {}) do if it[field] == label then return it end end
        error("nothing labelled '" .. label .. "'", 3)
    end
    function h.card(vm, title) return find(vm.cards, "title", title) end
    function h.button(vm, text) return find(vm.buttons, "text", text) end
    function h.item(vm, text) return find(vm.items, "text", text) end
    function h.option(vm, text) return find(vm.options, "text", text) end
    return h
end

local ME = { username = "rat", displayName = "Rato", currentStreak = 3,
    level = { level = 2, totalXp = 120, progressPercent = 40, xpToNextLevel = 80 } }

local function script(extra)
    local s = { ["POST /api/v1/auth/login"] = { { 200, { accessToken = "A", refreshToken = "R", expiresIn = 1800 } } },
        ["GET /api/v1/users/me"] = { { 200, ME }, { 200, ME }, { 200, ME }, { 200, ME } } }
    for k, v in pairs(extra or {}) do s[k] = v end
    return s
end

local function signIn(h)
    h.open()
    h.card(h.last().vm, "Entrar").callback()
    h.last().vm.on_submit("me@x.io", "pw")
end

local function question(id)
    return { id = id, title = "Pods", questionText = "O que executa contêineres?", topicName = "Kubernetes", difficulty = "Medium",
        xpReward = 25, options = { { id = id .. "a", text = "Um pod" }, { id = id .. "b", text = "Um node" } } }
end

function tests.techrat_opens_on_its_home_screen_and_signing_in_shows_the_learner(t)
    local h = harness(script())
    h.open()
    local home = h.last()
    t.eq({ home.screen, home.vm.signed_in, home.vm.title }, { "home", false, "TechRat" }, "signed-out home")
    t.eq(#home.vm.cards, 1, "only signing in")
    h.card(home.vm, "Entrar").callback()
    t.eq(h.last().screen, "signIn", "sign-in dialog")
    h.last().vm.on_submit("me@x.io", "pw")
    t.eq(h.requests[1].body, { email = "me@x.io", password = "pw" }, "credentials")
    local vm = h.last().vm
    t.eq({ h.last().screen, vm.signed_in, vm.hello, vm.level_text, vm.xp_text, vm.level_progress, vm.next_text, vm.streak_text },
        { "home", true, "Olá, Rato", "Nível 2", "120 XP", 0.4, "80 XP para o nível 3", "Sequência de 3 dias" }, "signed-in home")
    t.eq({ vm.cards[1].title, vm.cards[1].primary, vm.cards[2].title, vm.cards[3].title }, { "Desafio diário", true, "Temas", "Roadmaps" }, "cards")
    t.eq(h.settings.email, "me@x.io", "email remembered")
end

function tests.a_topic_session_from_choosing_to_the_summary(t)
    local h = harness(script({
        ["GET /api/v1/topics"] = { { 200, { { slug = "kubernetes", name = "Kubernetes", questions = { total = 30 } } } } },
        ["POST /api/v1/practice/sessions"] = { { 200, { id = "S1", totalQuestions = 1, questions = { question("Q1") } } },
            { 200, { id = "S2", totalQuestions = 1, questions = { question("Q2") } } } },
        ["POST /api/v1/practice/sessions/S1/answers"] = { { 200, {
            feedback = { isCorrect = false, correctOptionId = "Q1a", explanation = "Pods executam contêineres.", xpEarned = 0 },
            totalXp = 120, level = { level = 2, progressPercent = 40, xpToNextLevel = 80 }, currentStreak = 3,
            session = { answered = 1, total = 1, correct = 0, xpEarned = 0, isComplete = true },
        } } },
    }))
    signIn(h)
    h.card(h.last().vm, "Temas").callback()
    local list = h.last()
    t.eq({ list.screen, list.vm.title, list.vm.items[1].detail }, { "list", "Temas", "30 questões" }, "topics")
    h.item(list.vm, "Kubernetes").callback()
    t.eq(h.last().screen, "choose", "how many")
    h.option(h.last().vm, "5").callback()
    t.eq(h.lastRequest().body, { mode = "Practice", topicSlug = "kubernetes", count = 5 }, "session request")

    local q = h.last().vm
    t.eq({ h.last().screen, q.heading, q.counter, q.progress, q.selected, q.answer_text },
        { "question", "Kubernetes · Médio", "1 / 1", 0, nil, "Responder" }, "question")
    t.eq({ q.options[2].letter, q.options[2].text }, { "B", "Um node" }, "option B")
    q.on_select(2)
    t.eq({ h.last().screen, h.last().vm.selected, h.last().extra }, { "question", 2, "ui" }, "selected, quick refresh")
    h.last().vm.on_answer()
    t.eq(h.lastRequest().body.selectedOptionId, "Q1b", "answer sent")

    local fb = h.last().vm
    t.eq({ h.last().screen, fb.verdict, fb.correct, fb.chosen.letter, fb.right.letter, fb.right.text, fb.explanation },
        { "feedback", "✗ Não foi dessa vez.", false, "B", "A", "Um pod", "Pods executam contêineres." }, "feedback")
    h.button(fb, "Ver resultado").callback()

    local s = h.last().vm
    t.eq({ h.last().screen, s.score, s.score_caption, s.xp_text, s.level_text, s.next_text },
        { "summary", "0/1", "corretas · 0% de acerto", "+0 XP", "Nível 2", "80 XP para o nível 3" }, "summary")
    h.button(s, "Jogar de novo").callback()
    t.eq({ h.lastRequest().path, h.lastRequest().body.topicSlug }, { "/api/v1/practice/sessions", "kubernetes" }, "same session again")
    t.eq(h.last().vm.counter, "1 / 1", "new question")
end

function tests.quitting_a_question_goes_back_home(t)
    local h = harness(script({ ["POST /api/v1/daily-challenge/start"] = { { 200, { id = "D1", totalQuestions = 1, questions = { question("Q7") } } } } }))
    signIn(h)
    h.card(h.last().vm, "Desafio diário").callback()
    t.eq(h.last().screen, "question", "daily question")
    h.last().vm.on_quit()
    t.eq({ h.last().screen, h.last().vm.signed_in }, { "home", true }, "home")
end

function tests.the_daily_challenge_cannot_be_played_twice_from_its_summary(t)
    local h = harness(script({
        ["POST /api/v1/daily-challenge/start"] = { { 200, { id = "D1", totalQuestions = 1, questions = { question("Q7") } } } },
        ["POST /api/v1/practice/sessions/D1/answers"] = { { 200, {
            feedback = { isCorrect = true, correctOptionId = "Q7a", explanation = "", xpEarned = 25 },
            totalXp = 145, level = { level = 2, progressPercent = 52, xpToNextLevel = 55 }, currentStreak = 4,
            session = { answered = 1, total = 1, correct = 1, xpEarned = 25, isComplete = true },
        } } },
    }))
    signIn(h)
    h.card(h.last().vm, "Desafio diário").callback()
    h.last().vm.on_select(1)
    h.last().vm.on_answer()
    local fb = h.last().vm
    t.eq({ fb.verdict, fb.xp_text, fb.explanation }, { "✓ Correto!", "+25 XP", "Esta questão não tem explicação." }, "right answer")
    h.button(fb, "Ver resultado").callback()
    local labels = {}
    for _, b in ipairs(h.last().vm.buttons) do labels[#labels + 1] = b.text end
    t.eq(labels, { "Início" }, "only home")
end

function tests.a_roadmap_not_started_offers_to_start_it_and_a_locked_one_says_why(t)
    local h = harness(script({
        ["GET /api/v1/roadmaps"] = { { 200, { { slug = "system-design", name = "System Design" } } } },
        ["GET /api/v1/roadmaps/system-design"] = { { 200, { summary = { name = "System Design", progress = { isStarted = false } }, modules = {} } } },
        ["POST /api/v1/roadmaps/system-design/start"] = { { 403, {} } },
    }))
    signIn(h)
    h.card(h.last().vm, "Roadmaps").callback()
    h.item(h.last().vm, "System Design").callback()
    t.eq({ h.last().screen, h.last().vm.title }, { "choose", "System Design" }, "offer")
    h.option(h.last().vm, "Começar este roadmap").callback()
    t.eq({ h.last().screen, h.last().vm }, { "message", "Conclua antes os pré-requisitos deste roadmap em techrat.io." }, "locked")
end

function tests.a_started_roadmap_lets_only_the_current_step_be_practised(t)
    local h = harness(script({
        ["GET /api/v1/roadmaps/backend"] = { { 200, { summary = { name = "Backend", progress = { isStarted = true } }, modules = {
            { title = "HTTP", steps = { { id = "st1", title = "Verbos", status = "Completed" }, { id = "st2", title = "Cache", status = "Current" } } },
            { title = "BD", steps = { { id = "st3", title = "Índices", status = "Locked" } } },
        } } } },
        ["POST /api/v1/practice/sessions"] = { { 200, { id = "S2", totalQuestions = 1, questions = { question("Q9") } } } },
    }))
    signIn(h)
    h.plugin:showRoadmap("backend")
    local items = h.last().vm.items
    t.eq({ items[1].detail, items[1].enabled }, { "concluída", false }, "completed step")
    t.eq({ items[2].detail, items[2].enabled }, { "atual", true }, "current step")
    t.eq({ items[3].detail, items[3].enabled }, { "bloqueada", false }, "locked step")
    items[2].callback()
    t.eq(h.lastRequest().body, { mode = "Roadmap", roadmapStepId = "st2", count = 10 }, "step session")
end

function tests.an_expired_session_says_so_and_goes_back_to_signing_in(t)
    local h = harness(script({
        ["GET /api/v1/topics"] = { { 401, {} } },
        ["POST /api/v1/auth/refresh"] = { { 401, {} } },
    }))
    signIn(h)
    h.card(h.last().vm, "Temas").callback()
    local shown = {}
    for i = #h.screens - 1, #h.screens do shown[#shown + 1] = h.screens[i].screen end
    t.eq(shown, { "home", "message" }, "home, then the message")
    t.eq(h.last().vm, "Sua sessão do TechRat terminou. Entre de novo.", "message")
    t.eq(h.screens[#h.screens - 1].vm.signed_in, false, "signed out")
    t.eq(h.settings.tokens, nil, "tokens forgotten")
end

function tests.signing_out_returns_to_the_signed_out_home(t)
    local h = harness(script({ ["POST /api/v1/auth/logout"] = { { 204, nil } } }))
    signIn(h)
    h.button(h.last().vm, "Sair").callback()
    t.eq(h.settings.tokens, nil, "tokens forgotten")
    t.eq(h.screens[#h.screens - 1].vm.signed_in, false, "signed-out home")
    t.eq(h.last().vm, "Você saiu do TechRat.", "message")
end

function tests.the_language_can_be_changed_from_the_home_and_is_remembered(t)
    local h = harness(script())
    signIn(h)
    t.eq(h.lastRequest().language, "pt-BR", "follows KOReader's language at first")
    h.button(h.last().vm, "Idioma").callback()
    local choice = h.last().vm
    t.eq({ h.last().screen, choice.title, choice.options[1].text, choice.options[2].text, choice.cancel },
        { "choose", "Idioma", "English", "Português (Brasil)", "Cancelar" }, "the languages")
    choice.options[1].callback()
    t.eq(h.settings.language, "en", "remembered")
    local home = h.last()
    t.eq({ home.screen, home.vm.hello, home.vm.cards[1].title, h.button(home.vm, "Language").text },
        { "home", "Hi, Rato", "Daily challenge", "Language" }, "the home again, in English")
    home.vm.cards[2].callback()
    t.eq(h.lastRequest().language, "en", "questions and topics come in English too")
end

function tests.a_saved_language_wins_over_koreaders_and_works_signed_out(t)
    local h = harness(script(), { language = "en" })
    h.open()
    local home = h.last().vm
    t.eq({ home.signed_in, home.cards[1].title }, { false, "Sign in" }, "signed-out home in English")
    h.button(home, "Language").callback()
    h.last().vm.options[2].callback()
    t.eq({ h.settings.language, h.last().vm.cards[1].title }, { "pt-BR", "Entrar" }, "back to Portuguese")
end

-- Without internet ------------------------------------------------------------------------------------------------

local OFFLINE_NOTICE = "Sem conexão. Mostrando seu nível e XP da última vez."

function tests.opening_techrat_offline_shows_the_last_known_progress_without_asking_for_wi_fi(t)
    local h = harness(script())
    signIn(h)
    h.network.online, h.network.connected = false, false
    local before = #h.requests
    h.open()
    local vm = h.last().vm
    t.eq({ h.last().screen, vm.signed_in, vm.notice, vm.hello, vm.level_text, vm.xp_text },
        { "home", true, OFFLINE_NOTICE, "Olá, Rato", "Nível 2", "120 XP" }, "the saved progress")
    t.eq(#h.requests, before, "no request")
    t.eq(h.network.calls, {}, "no Wi-Fi prompt just for opening")
    t.eq(#vm.cards, 3, "the cards are still there")
end

function tests.offline_with_nothing_saved_the_home_has_the_notice_but_no_progress(t)
    local h = harness(script(), { tokens = { access = "A", refresh = "R", expires_at = os.time() + 3600 } })
    h.network.online, h.network.connected = false, false
    h.open()
    local vm = h.last().vm
    t.eq({ vm.signed_in, vm.notice, vm.level_text, vm.hello }, { true, OFFLINE_NOTICE, nil, nil }, "no progress to show")
end

function tests.when_the_profile_cannot_be_fetched_the_home_falls_back_to_the_saved_one(t)
    local h = harness(script())
    signIn(h)
    h.plugin.api.transport = function() return nil, nil, "timeout" end -- online, but the server never answers
    h.open()
    t.eq({ h.last().screen, h.last().vm.notice, h.last().vm.level_text }, { "home", OFFLINE_NOTICE, "Nível 2" }, "saved home")
end

function tests.playing_offline_asks_in_techrats_language_to_turn_on_wi_fi(t)
    local h = harness(script({
        ["GET /api/v1/topics"] = { { 200, { { slug = "kubernetes", name = "Kubernetes", questions = { total = 30 } } } } },
    }))
    signIn(h)
    h.network.online, h.network.connected = false, false
    h.open()
    h.card(h.last().vm, "Temas").callback()
    local ask = h.last()
    t.eq({ ask.screen, ask.vm.text, ask.vm.ok_text, ask.vm.cancel_text },
        { "confirm", "O TechRat precisa de internet para isso. Ligar o Wi-Fi?", "Ligar o Wi-Fi", "Agora não" }, "asks")
    ask.vm.on_ok()
    t.eq({ h.network.calls[1], h.last().screen, h.last().vm.items[1].text }, { "toggleWifiOn", "list", "Kubernetes" }, "turned on, then the topics")
end

function tests.declining_wi_fi_leaves_techrat_where_it_was(t)
    local h = harness(script())
    signIn(h)
    h.network.online, h.network.connected = false, false
    h.open()
    local requests = #h.requests
    h.card(h.last().vm, "Temas").callback()
    h.last().vm.on_cancel()
    t.eq({ #h.requests, h.network.calls }, { requests, {} }, "nothing requested, Wi-Fi left off")
end

function tests.a_wi_fi_without_internet_says_so_instead_of_doing_nothing(t)
    local h = harness(script())
    signIn(h)
    h.network.online, h.network.connected = false, true
    h.card(h.last().vm, "Temas").callback()
    t.eq({ h.last().screen, h.last().vm }, { "message", "Não foi possível falar com o TechRat. Confira o Wi-Fi e tente de novo." }, "message")
end

function tests.koreader_set_to_turn_wi_fi_on_by_itself_is_left_to_do_so(t)
    local h = harness(script({
        ["GET /api/v1/topics"] = { { 200, {} } },
    }), nil, { wifi_enable_action = "turn_on" })
    signIn(h)
    h.network.online, h.network.connected = false, false
    h.card(h.last().vm, "Temas").callback()
    t.eq(h.network.calls, { "runWhenOnline" }, "KOReader's own way, no TechRat question")
end

function tests.signing_out_forgets_the_saved_progress(t)
    local h = harness(script({ ["POST /api/v1/auth/logout"] = { { 204, nil } } }))
    signIn(h)
    t.ok(h.settings.me ~= nil, "saved while signed in")
    h.button(h.last().vm, "Sair").callback()
    t.eq(h.settings.me, nil, "forgotten")
end

return tests
