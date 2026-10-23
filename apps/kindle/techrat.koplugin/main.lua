--[[--
TechRat on the Kindle (KOReader plugin, ADR-0044): tapping TechRat in KOReader's tools menu opens TechRat's own home
screen; from there the learner plays the daily challenge, a topic or a roadmap step, with the XP, level and streak of
their account.

This file is the flow: what to show next and which request to make. Requests and the session live in techrat_api and
techrat_game, and every screen is drawn by techrat_ui from the plain table built here, so the tests can run all of it
without KOReader (apps/kindle/tests) and the emulator preview can show the screens with sample data (apps/kindle/dev).

KOReader puts the plugin folder on package.path only while it loads this file, so every module is required here.
]]
local Api = require("techrat_api")
local DataStorage = require("datastorage")
local Game = require("techrat_game")
local I18n = require("techrat_i18n")
local LuaSettings = require("luasettings")
local NetworkMgr = require("ui/network/manager")
local UI = require("techrat_ui")
local WidgetContainer = require("ui/widget/container/widgetcontainer")
local transport = require("techrat_transport")
local GetText = require("gettext")

local DEFAULT_SERVER = "https://techrat.io"
local ROADMAP_STEP_QUESTIONS = 10 -- the same as the web's "Practice this step"
local COUNTS = { 5, 10, 20 }

local TechRat = WidgetContainer:extend{
    name = "techrat",
    is_doc_only = false,
}

function TechRat:init()
    self.settings = LuaSettings:open(DataStorage:getSettingsDir() .. "/techrat.lua")
    -- The language chosen in TechRat's home, else KOReader's.
    self.locale = self.settings:readSetting("language") or I18n.locale(GetText.current_lang)
    self.t = I18n.new(self.locale)
    self.api = Api.new({
        base_url = self.settings:readSetting("server", DEFAULT_SERVER),
        locale = self.locale,
        transport = transport,
        tokens = self.settings:readSetting("tokens"),
        save_tokens = function(tokens)
            if tokens then self.settings:saveSetting("tokens", tokens) else self.settings:delSetting("tokens") end
            self.settings:flush()
        end,
    })
    self.ui.menu:registerToMainMenu(self)
end

function TechRat:addToMainMenu(menu_items)
    menu_items.techrat = {
        text = self.t("menu"),
        sorting_hint = "tools",
        callback = function() self:openHome() end,
    }
end

--- Runs `fn` once the Kindle is online. KOReader's own prompt says nothing when it is declined, and nothing at all on
--- a Wi-Fi without internet, so TechRat asks itself, in its language: turning Wi-Fi on runs `fn`, declining leaves the
--- screen as it was. When KOReader is set to turn Wi-Fi on by itself (or to wait silently), that choice is kept.
function TechRat:online(fn)
    if NetworkMgr:isOnline() then return fn() end
    if NetworkMgr:isConnected() then return UI.message(self.t("error_network")) end
    local action = G_reader_settings and G_reader_settings:readSetting("wifi_enable_action")
    if action == "turn_on" or action == "ignore" then return NetworkMgr:runWhenOnline(fn) end
    UI.confirm({
        text = self.t("wifi_needed"), ok_text = self.t("wifi_turn_on"), cancel_text = self.t("not_now"),
        on_ok = function() NetworkMgr:toggleWifiOn(fn) end,
        on_cancel = function() end,
    })
end

--- Says what went wrong, in the learner's language. An ended session also goes back to the signed-out home.
function TechRat:fail(kind, status)
    local t = self.t
    if kind == "auth" then self:showHome(nil) end
    UI.message(({
        network = t("error_network"),
        auth = t("error_auth"),
        login = t("error_login"),
        email_not_confirmed = t("error_unconfirmed"),
    })[kind] or t("error_server", tostring(status or kind)))
end

local function name(me)
    if type(me.displayName) == "string" and me.displayName ~= "" then return me.displayName end
    if type(me.username) == "string" then return me.username end
end

--- The level, XP and streak lines shared by the home and the summary.
function TechRat:levelLines(level, total_xp, progress, xp_to_next, streak)
    local t = self.t
    return {
        level_text = t("level", level),
        xp_text = t("xp_total", total_xp),
        level_progress = progress,
        next_text = t("xp_to_next", xp_to_next, level + 1),
        streak_text = t("streak_days", streak),
    }
end

-- Home -----------------------------------------------------------------------------------------------------------

--- Opens the home. Signed in without internet it still opens, with the progress saved the last time it was fetched
--- (opening TechRat never asks for Wi-Fi: playing does).
function TechRat:openHome()
    if not self.api:isSignedIn() then return self:showHome(nil) end
    if not NetworkMgr:isOnline() then return self:showOfflineHome() end
    local me, err, status = self.api:me()
    if err == "network" then return self:showOfflineHome() end
    if not me then return self:fail(err, status) end
    self.settings:saveSetting("me", {
        username = me.username, displayName = me.displayName, currentStreak = me.currentStreak,
        level = type(me.level) == "table" and me.level or nil,
    })
    self.settings:flush()
    self:showHome(me)
end

function TechRat:showOfflineHome()
    local saved = self.settings:readSetting("me")
    self:showHome(type(saved) == "table" and saved or {}, true)
end

--- The home screen of a learner (`me` from /users/me, or saved: it may lack any field), or the signed-out one when
--- `me` is nil. `offline` adds a line saying there is no internet and the progress shown is the saved one.
function TechRat:showHome(me, offline)
    local t = self.t
    local vm = { title = t("menu"), signed_in = me ~= nil, notice = offline and t("offline_notice") or nil }
    if me and type(me.level) == "table" then
        local lv = me.level
        local level = tonumber(lv.level) or 1
        for k, v in pairs(self:levelLines(level, tonumber(lv.totalXp) or 0, (tonumber(lv.progressPercent) or 0) / 100,
            tonumber(lv.xpToNextLevel) or 0, tonumber(me.currentStreak) or 0)) do vm[k] = v end
    end
    if me then
        if name(me) then vm.hello = t("hello", name(me)) end
        vm.cards = {
            { title = t("daily"), subtitle = t("daily_hint"), primary = true,
              callback = function() self:play(function() return Game.startDaily(self.api) end, false) end },
            { title = t("topics"), subtitle = t("topics_hint"), callback = function() self:online(function() self:showTopics() end) end },
            { title = t("roadmaps"), subtitle = t("roadmaps_hint"), callback = function() self:online(function() self:showRoadmaps() end) end },
        }
        vm.buttons = {
            { text = t("sign_out"), callback = function()
                self.api:logout()
                self.settings:delSetting("me")
                self.settings:flush()
                self:showHome(nil)
                UI.message(t("signed_out"))
            end },
            { text = t("language"), callback = function() self:chooseLanguage(me, offline) end },
            { text = t("close"), callback = UI.close },
        }
    else
        vm.hint = t("home_hint")
        vm.cards = { { title = t("sign_in"), subtitle = t("sign_in_card"), primary = true, callback = function() self:showSignIn() end } }
        vm.buttons = {
            { text = t("language"), callback = function() self:chooseLanguage(nil) end },
            { text = t("close"), callback = UI.close },
        }
    end
    UI.home(vm)
end

--- Offers the plugin's languages; the choice is remembered and also asks the server for questions in it.
function TechRat:chooseLanguage(me, offline)
    local options = {}
    for i, lang in ipairs(I18n.languages) do
        options[i] = { text = lang.name, callback = function()
            self.locale, self.t, self.api.locale = lang.locale, I18n.new(lang.locale), lang.locale
            self.settings:saveSetting("language", lang.locale)
            self.settings:flush()
            self:showHome(me, offline)
        end }
    end
    UI.choose(self.t("language"), options, self.t("cancel"))
end

function TechRat:showSignIn()
    local t = self.t
    UI.signIn({
        title = t("sign_in"), email = self.settings:readSetting("email", ""), email_hint = t("email"),
        password_hint = t("password"), cancel = t("cancel"), submit = t("sign_in"),
        on_submit = function(email, password)
            self.settings:saveSetting("email", email)
            self.settings:flush()
            self:online(function()
                local ok, err = self.api:login(email, password)
                if not ok then return self:fail(err) end
                self:openHome()
            end)
        end,
    })
end

-- Choosing what to practise ---------------------------------------------------------------------------------------

local function questionCount(topic)
    local q = type(topic.questions) == "table" and topic.questions or {}
    return tonumber(q.total) or ((tonumber(q.easy) or 0) + (tonumber(q.medium) or 0) + (tonumber(q.hard) or 0) + (tonumber(q.expert) or 0))
end

function TechRat:showTopics()
    local topics, err, status = self.api:topics()
    if not topics then return self:fail(err, status) end
    local items = {}
    for _, topic in ipairs(topics) do
        items[#items + 1] = {
            text = topic.name,
            detail = self.t("questions", questionCount(topic)),
            callback = function() self:askCount(topic.slug) end,
        }
    end
    UI.list({ title = self.t("topics"), items = items })
end

function TechRat:askCount(topic_slug)
    local options = {}
    for _, n in ipairs(COUNTS) do
        options[#options + 1] = { text = tostring(n), callback = function()
            self:play(function() return Game.start(self.api, { mode = "Practice", topicSlug = topic_slug, count = n }) end, true)
        end }
    end
    UI.choose(self.t("how_many"), options, self.t("cancel"))
end

function TechRat:showRoadmaps()
    local roadmaps, err, status = self.api:roadmaps()
    if not roadmaps then return self:fail(err, status) end
    local items = {}
    for _, roadmap in ipairs(roadmaps) do
        local p = type(roadmap.progress) == "table" and roadmap.progress or nil
        items[#items + 1] = {
            text = roadmap.name,
            detail = p and p.isStarted and string.format("%d%%", math.floor((tonumber(p.percentComplete) or 0) + 0.5)) or nil,
            callback = function() self:online(function() self:showRoadmap(roadmap.slug) end) end,
        }
    end
    UI.list({ title = self.t("roadmaps"), items = items })
end

--- A started roadmap lists its steps; the current ones can be practised, as on the web. Otherwise it offers to start.
function TechRat:showRoadmap(slug)
    local t = self.t
    local roadmap, err, status = self.api:roadmap(slug)
    if not roadmap then return self:fail(err, status) end
    local summary = roadmap.summary or {}
    local progress = type(summary.progress) == "table" and summary.progress or {}
    if not progress.isStarted then
        return UI.choose(summary.name, { { text = t("start_roadmap"), callback = function()
            self:online(function()
                local ok, start_err, start_status = self.api:startRoadmap(slug)
                if ok then
                    UI.message(t("roadmap_started"))
                    self:showRoadmap(slug)
                elseif start_err == "forbidden" then
                    UI.message(t("roadmap_locked"))
                else
                    self:fail(start_err, start_status)
                end
            end)
        end } }, t("cancel"))
    end

    local items, playable = {}, false
    for _, module in ipairs(type(roadmap.modules) == "table" and roadmap.modules or {}) do
        for _, step in ipairs(type(module.steps) == "table" and module.steps or {}) do
            local current = step.status == "Current"
            playable = playable or current
            items[#items + 1] = {
                text = module.title .. " · " .. step.title,
                detail = current and t("step_current") or (step.status == "Completed" and t("step_done") or t("step_locked")),
                enabled = current,
                callback = function()
                    self:play(function()
                        return Game.start(self.api, { mode = "Roadmap", roadmapStepId = step.id, count = ROADMAP_STEP_QUESTIONS })
                    end, true)
                end,
            }
        end
    end
    if not playable then return UI.message(t("no_steps")) end
    UI.list({ title = summary.name, items = items })
end

-- Playing --------------------------------------------------------------------------------------------------------

--- Starts a session with `start()` (a game or an error) and shows its first unanswered question. `repeatable`
--- offers "Play again" at the end (not for the daily challenge, which is one session a day).
function TechRat:play(start, repeatable)
    self:online(function()
        local game, err, status = start()
        if not game then return self:fail(err, status) end
        self.game, self.restart = game, repeatable and start or nil
        self.selected = nil
        if game:current() then self:showQuestion() else self:showSummary() end
    end)
end

--- The current question. `refresh` is "ui" when only the selection changed (a quick refresh instead of a flash).
function TechRat:showQuestion(refresh)
    local t, q = self.t, self.game:current()
    if not refresh then self.question_started = os.time() end
    local heading = type(q.topic) == "string" and q.topic or ""
    if q.difficulty then heading = heading .. " · " .. t("difficulty_" .. q.difficulty) end
    UI.question({
        heading = heading,
        counter = string.format("%d / %d", q.number, q.total),
        progress = (q.number - 1) / math.max(q.total, 1),
        title = q.title,
        text = q.text,
        options = q.options,
        selected = self.selected,
        on_select = function(i)
            self.selected = i
            self:showQuestion("ui")
        end,
        answer_text = t("answer"),
        on_answer = function() self:submit() end,
        quit_text = t("quit"),
        on_quit = function() self:openHome() end,
    }, refresh)
end

function TechRat:submit()
    local index = self.selected
    if not index then return end
    local chosen = self.game:current().options[index]
    self:online(function()
        local fb, err, status = self.game:answer(index, os.time() - (self.question_started or os.time()))
        if not fb then return self:fail(err, status) end
        self.selected = nil
        self:showFeedback(fb, chosen)
    end)
end

function TechRat:showFeedback(fb, chosen)
    local t = self.t
    local more = self.game:next()
    UI.feedback({
        verdict = fb.correct and ("✓ " .. t("correct")) or ("✗ " .. t("incorrect")),
        xp_text = fb.xp > 0 and t("xp", fb.xp) or nil,
        correct = fb.correct,
        chosen = { letter = chosen.letter, text = chosen.text },
        right = (not fb.correct and fb.correct_letter) and { letter = fb.correct_letter, text = fb.correct_text } or nil,
        chosen_label = t("your_answer"),
        right_label = t("right_answer"),
        explanation_title = t("explanation"),
        explanation = fb.explanation ~= "" and fb.explanation or t("no_explanation"),
        status = t("progress", fb.level, fb.total_xp, fb.streak),
        buttons = {
            { text = t("quit"), callback = function() self:openHome() end },
            { text = more and t("next") or t("results"), primary = true, callback = function()
                if more then self:showQuestion() else self:showSummary() end
            end },
        },
    })
end

function TechRat:showSummary()
    local t, s = self.t, self.game:summary()
    local vm = self:levelLines(s.level, s.total_xp, s.level_progress, s.xp_to_next, s.streak)
    vm.xp_total_text, vm.xp_text = vm.xp_text, t("xp", s.xp)
    vm.title = t("summary_title")
    vm.score = string.format("%d/%d", s.correct, s.total)
    vm.score_caption = t("score_caption", s.total > 0 and math.floor(s.correct / s.total * 100 + 0.5) or 0)
    vm.buttons = { { text = t("home"), callback = function() self:openHome() end } }
    if self.restart then
        local restart = self.restart
        vm.buttons[2] = { text = t("play_again"), primary = true, callback = function() self:play(restart, true) end }
    end
    UI.summary(vm)
end

return TechRat
