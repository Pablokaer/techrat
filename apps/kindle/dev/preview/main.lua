--[[--
TechRat preview (dev only, never shipped): opens the real TechRat screens in the KOReader emulator with the sample API
of techrat_fake_api, signed in, without a network. apps/kindle/dev/emulator.sh installs it with links to the plugin's
files, so a change shows after restarting the emulator.

Environment:
  TECHRAT_LANG    KOReader language for the preview (default pt_BR)
  TECHRAT_SHOTS   a folder: walk through every screen, save a PNG of each there and quit
]]
package.loaded["techrat_transport"] = require("techrat_fake_api")

local DataStorage = require("datastorage")
local Device = require("device")
local GetText = require("gettext")
local LuaSettings = require("luasettings")
local NetworkMgr = require("ui/network/manager")
local UIManager = require("ui/uimanager")
local WidgetContainer = require("ui/widget/container/widgetcontainer")

-- The emulator has no Wi-Fi to turn on and the sample API needs none (the walk-through switches it "off" for a while).
local function online() return true end
NetworkMgr.isOnline, NetworkMgr.isConnected = online, online
NetworkMgr.runWhenOnline = function(_, fn) fn() end
NetworkMgr.toggleWifiOn = function(_, fn) fn() end
GetText.changeLang(os.getenv("TECHRAT_LANG") or "pt_BR")

local settings = LuaSettings:open(DataStorage:getSettingsDir() .. "/techrat.lua")
settings:saveSetting("tokens", { access = "demo", refresh = "demo", expires_at = os.time() + 315360000 })
settings:flush()

local TechRat = require("techrat_main")
local UI = require("techrat_ui")

local Preview = WidgetContainer:extend{ name = "techratpreview", is_doc_only = false }

function Preview:init()
    if Preview.started then return end -- once, not again when a book opens
    Preview.started = true
    self.techrat = TechRat:new{ ui = self.ui }
    local shots = os.getenv("TECHRAT_SHOTS")
    UIManager:scheduleIn(1, function()
        if shots and shots ~= "" then self:screenshots(shots) else self.techrat:openHome() end
    end)
end

--- Shows each screen in turn, saves `NN-name.png` of each into `dir` and quits KOReader.
function Preview:screenshots(dir)
    local tr = self.techrat
    local open, languages = {}, nil
    local function keep(widget) open[#open + 1] = widget; return widget end
    local function closeOpen()
        for _, w in ipairs(open) do UIManager:close(w) end
        open = {}
    end
    local steps = {
        { "home-signed-out", function() tr:showHome(nil) end },
        { "home", function() tr:openHome() end },
        { "language", function()
            local choose = UI.choose
            UI.choose = function(title, options, cancel) languages = options; return keep(choose(title, options, cancel)) end
            tr:chooseLanguage(tr.api:me())
            UI.choose = choose
        end },
        { "home-english", function() closeOpen(); languages[1].callback() end },
        { "home-portuguese", function()
            local choose = UI.choose
            UI.choose = function(_, options) options[2].callback() end
            tr:chooseLanguage(tr.api:me())
            UI.choose = choose
        end },
        { "home-offline", function()
            NetworkMgr.isOnline, NetworkMgr.isConnected = function() return false end, function() return false end
            tr:openHome()
        end },
        { "wifi-question", function()
            local confirm = UI.confirm
            UI.confirm = function(vm) return keep(confirm(vm)) end
            tr:online(function() end)
            UI.confirm = confirm
        end },
        { "back-online", function()
            closeOpen()
            NetworkMgr.isOnline, NetworkMgr.isConnected = online, online
            tr:openHome()
        end },
        { "topics", function()
            local list = UI.list
            UI.list = function(vm) return keep(list(vm)) end
            tr:showTopics()
            UI.list = list
        end },
        { "count", function()
            closeOpen()
            local choose = UI.choose
            UI.choose = function(...) return keep(choose(...)) end
            tr:askCount("kubernetes")
            UI.choose = choose
        end },
        { "question", function()
            closeOpen()
            tr:play(function() return require("techrat_game").start(tr.api, { mode = "Practice", topicSlug = "kubernetes", count = 3 }) end, true)
        end },
        { "question-selected", function() tr.selected = 2; tr:showQuestion("ui") end },
        { "feedback-wrong", function() tr:submit() end },
        { "question-2", function() tr:showQuestion() end },
        { "feedback-right", function() tr.selected = 3; tr:submit() end },
        { "question-3-long", function() tr:showQuestion() end },
        { "summary", function() tr.selected = 2; tr:submit(); tr:showSummary() end },
        { "roadmap-steps", function()
            local list = UI.list
            UI.list = function(vm) return keep(list(vm)) end
            tr:showRoadmap("backend-developer")
            UI.list = list
        end },
    }
    local i = 0
    local function step()
        i = i + 1
        if i > #steps then return UIManager:quit() end
        steps[i][2]()
        UIManager:scheduleIn(1.5, function()
            UIManager:forceRePaint()
            Device.screen:shot(string.format("%s/%02d-%s.png", dir, i, steps[i][1]))
            step()
        end)
    end
    step()
end

return Preview
