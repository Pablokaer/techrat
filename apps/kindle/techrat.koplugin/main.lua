--[[--
TechRat on the Kindle (KOReader plugin): pick a topic, a roadmap step or the daily challenge and answer its questions
on the e-ink screen, with the XP, level and streak of the learner's account (ADR-0044).

This file is only the KOReader side: the touch-menu entry, the lists and the question screens. What happens is decided
by techrat_api (requests and the session) and techrat_game (where the learner is in a session), which are tested
without KOReader (apps/kindle/tests). The screens use a full refresh so e-ink shows no ghosting between questions.

KOReader puts the plugin folder on package.path only while it loads this file, so every module is required here.
]]
local Api = require("techrat_api")
local DataStorage = require("datastorage")
local Game = require("techrat_game")
local I18n = require("techrat_i18n")
local ButtonDialog = require("ui/widget/buttondialog")
local InfoMessage = require("ui/widget/infomessage")
local LuaSettings = require("luasettings")
local Menu = require("ui/widget/menu")
local MultiInputDialog = require("ui/widget/multiinputdialog")
local NetworkMgr = require("ui/network/manager")
local TextViewer = require("ui/widget/textviewer")
local UIManager = require("ui/uimanager")
local WidgetContainer = require("ui/widget/container/widgetcontainer")
local transport = require("techrat_transport")
local GetText = require("gettext")

local DEFAULT_SERVER = "https://techrat.io"
local ROADMAP_STEP_QUESTIONS = 10 -- the same as the web's "Practice this step"

local TechRat = WidgetContainer:extend{
    name = "techrat",
    is_doc_only = false,
}

function TechRat:init()
    self.settings = LuaSettings:open(DataStorage:getSettingsDir() .. "/techrat.lua")
    self.locale = I18n.locale(GetText.current_lang)
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
        sub_item_table_func = function() return self:menuItems() end,
    }
end

function TechRat:menuItems()
    local t = self.t
    if not self.api:isSignedIn() then
        return { { text = t("sign_in"), callback = function() self:showSignIn() end } }
    end
    return {
        { text = t("topics"), callback = function() self:online(function() self:showTopics() end) end },
        { text = t("roadmaps"), callback = function() self:online(function() self:showRoadmaps() end) end },
        { text = t("daily"), callback = function() self:play(function() return Game.startDaily(self.api) end) end },
        { text = t("profile"), callback = function() self:online(function() self:showProgress() end) end, separator = true },
        { text = t("sign_out"), callback = function()
            self.api:logout()
            self:message(t("signed_out"))
        end },
    }
end

--- Runs `fn` once the Kindle is online (KOReader asks to turn the Wi-Fi on when needed).
function TechRat:online(fn)
    NetworkMgr:runWhenOnline(fn)
end

function TechRat:message(text)
    UIManager:show(InfoMessage:new{ text = text })
end

--- Shows what went wrong, in the learner's language.
function TechRat:fail(kind, status)
    local t = self.t
    local text = ({
        network = t("error_network"),
        auth = t("error_auth"),
        login = t("error_login"),
        email_not_confirmed = t("error_unconfirmed"),
    })[kind] or t("error_server", tostring(status or kind))
    self:message(text)
end

function TechRat:showList(title, items)
    local menu
    menu = Menu:new{
        title = title,
        item_table = items,
        covers_fullscreen = true,
        is_borderless = true,
        is_popout = false,
        close_callback = function() UIManager:close(menu) end,
    }
    UIManager:show(menu, "full")
end

-- Sign in --------------------------------------------------------------------------------------------------------

function TechRat:showSignIn()
    local t = self.t
    local dialog
    dialog = MultiInputDialog:new{
        title = t("sign_in"),
        fields = {
            { text = self.settings:readSetting("email", ""), hint = t("email") },
            { text = "", hint = t("password"), text_type = "password" },
        },
        buttons = { {
            { text = t("cancel"), id = "close", callback = function() UIManager:close(dialog) end },
            { text = t("sign_in"), is_enter_default = true, callback = function()
                local fields = dialog:getFields()
                local email, password = (fields[1] or ""):gsub("^%s+", ""):gsub("%s+$", ""), fields[2] or ""
                if email == "" or password == "" then return end
                UIManager:close(dialog)
                self.settings:saveSetting("email", email)
                self:online(function()
                    local ok, err = self.api:login(email, password)
                    if not ok then return self:fail(err) end
                    local me = self.api:me()
                    local name = type(me) == "table" and (type(me.displayName) == "string" and me.displayName or me.username) or email
                    self:message(t("signed_in_as", name))
                end)
            end },
        } },
    }
    UIManager:show(dialog)
    dialog:onShowKeyboard()
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
            mandatory = self.t("questions", questionCount(topic)),
            callback = function()
                self:askCount(function(count)
                    self:play(function() return Game.start(self.api, { mode = "Practice", topicSlug = topic.slug, count = count }) end)
                end)
            end,
        }
    end
    self:showList(self.t("topics"), items)
end

function TechRat:askCount(fn)
    local dialog
    local function choice(n)
        return { text = tostring(n), callback = function() UIManager:close(dialog); fn(n) end }
    end
    dialog = ButtonDialog:new{
        title = self.t("how_many"),
        buttons = {
            { choice(5), choice(10), choice(20) },
            { { text = self.t("cancel"), callback = function() UIManager:close(dialog) end } },
        },
    }
    UIManager:show(dialog)
end

function TechRat:showRoadmaps()
    local roadmaps, err, status = self.api:roadmaps()
    if not roadmaps then return self:fail(err, status) end
    local items = {}
    for _, roadmap in ipairs(roadmaps) do
        local p = type(roadmap.progress) == "table" and roadmap.progress or nil
        items[#items + 1] = {
            text = roadmap.name,
            mandatory = p and p.isStarted and string.format("%d%%", math.floor((tonumber(p.percentComplete) or 0) + 0.5)) or nil,
            callback = function() self:online(function() self:showRoadmap(roadmap.slug) end) end,
        }
    end
    self:showList(self.t("roadmaps"), items)
end

--- A started roadmap lists its steps; the current ones can be practised, as on the web. Otherwise it offers to start.
function TechRat:showRoadmap(slug)
    local t = self.t
    local roadmap, err, status = self.api:roadmap(slug)
    if not roadmap then return self:fail(err, status) end
    local summary = roadmap.summary or {}
    local progress = type(summary.progress) == "table" and summary.progress or {}
    if not progress.isStarted then
        local dialog
        dialog = ButtonDialog:new{
            title = summary.name,
            buttons = {
                { { text = t("start_roadmap"), callback = function()
                    UIManager:close(dialog)
                    self:online(function()
                        local ok, start_err, start_status = self.api:startRoadmap(slug)
                        if ok then
                            self:message(t("roadmap_started"))
                            self:showRoadmap(slug)
                        elseif start_err == "forbidden" then
                            self:message(t("roadmap_locked"))
                        else
                            self:fail(start_err, start_status)
                        end
                    end)
                end } },
                { { text = t("cancel"), callback = function() UIManager:close(dialog) end } },
            },
        }
        return UIManager:show(dialog)
    end

    local items, playable = {}, false
    for _, module in ipairs(type(roadmap.modules) == "table" and roadmap.modules or {}) do
        for _, step in ipairs(type(module.steps) == "table" and module.steps or {}) do
            local current = step.status == "Current"
            playable = playable or current
            items[#items + 1] = {
                text = module.title .. " · " .. step.title,
                mandatory = current and t("step_current") or (step.status == "Completed" and t("step_done") or t("step_locked")),
                select_enabled = current,
                callback = function()
                    self:play(function()
                        return Game.start(self.api, { mode = "Roadmap", roadmapStepId = step.id, count = ROADMAP_STEP_QUESTIONS })
                    end)
                end,
            }
        end
    end
    if not playable then return self:message(t("no_steps")) end
    self:showList(summary.name, items)
end

function TechRat:showProgress()
    local me, err, status = self.api:me()
    if not me then return self:fail(err, status) end
    local level = type(me.level) == "table" and me.level or {}
    local name = type(me.displayName) == "string" and me.displayName or me.username
    self:message(self.t("signed_in_as", name) .. "\n\n"
        .. self.t("progress", tonumber(level.level) or 0, tonumber(level.totalXp) or 0, tonumber(me.currentStreak) or 0))
end

-- Playing --------------------------------------------------------------------------------------------------------

--- Starts a session with `start()` (returns a game or an error) and shows its first unanswered question.
function TechRat:play(start)
    self:online(function()
        local game, err, status = start()
        if not game then return self:fail(err, status) end
        if game:current() then self:showQuestion(game) else self:showSummary(game) end
    end)
end

function TechRat:showQuestion(game)
    local t, q = self.t, game:current()
    local lines = { t("question_of", q.number, q.total) .. (type(q.topic) == "string" and (" · " .. q.topic) or ""), "", q.title, "", q.text, "" }
    for _, option in ipairs(q.options) do lines[#lines + 1] = option.letter .. ") " .. option.text end

    local started, viewer = os.time(), nil
    local answers = {}
    for i, option in ipairs(q.options) do
        answers[#answers + 1] = { text = option.letter, callback = function()
            UIManager:close(viewer)
            self:submit(game, i, os.time() - started)
        end }
    end
    viewer = TextViewer:new{
        title = t("answer_with"),
        text = table.concat(lines, "\n"),
        buttons_table = { answers, { { text = t("quit"), callback = function() UIManager:close(viewer) end } } },
    }
    UIManager:show(viewer, "full")
end

function TechRat:submit(game, index, seconds)
    local t = self.t
    self:online(function()
        local fb, err, status = game:answer(index, seconds)
        if not fb then
            self:showQuestion(game)
            return self:fail(err, status)
        end
        local lines = { fb.correct and t("correct") or t("incorrect") }
        if not fb.correct and fb.correct_letter then lines[#lines + 1] = t("correct_answer", fb.correct_letter, fb.correct_text) end
        if fb.xp > 0 then lines[#lines + 1] = t("xp", fb.xp) end
        if fb.explanation ~= "" then
            lines[#lines + 1] = ""
            lines[#lines + 1] = fb.explanation
        end

        local more, viewer = game:next(), nil
        viewer = TextViewer:new{
            title = fb.correct and t("correct") or t("incorrect"),
            text = table.concat(lines, "\n"),
            buttons_table = { {
                { text = more and t("next") or t("results"), callback = function()
                    UIManager:close(viewer)
                    if more then self:showQuestion(game) else self:showSummary(game) end
                end },
                { text = t("quit"), callback = function() UIManager:close(viewer) end },
            } },
        }
        UIManager:show(viewer, "full")
    end)
end

function TechRat:showSummary(game)
    local t, s = self.t, game:summary()
    self:message(t("summary_title") .. "\n\n" .. t("summary", s.correct, s.total, s.xp) .. "\n"
        .. t("progress", s.level, s.total_xp, s.streak))
end

return TechRat
