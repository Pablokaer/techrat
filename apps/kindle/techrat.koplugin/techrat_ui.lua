--[[--
TechRat's own full-screen screens for the Kindle, drawn with KOReader widgets: home, question, feedback and summary.

Every screen takes a plain table (what to show, already in the learner's language, plus callbacks) and draws it; it
makes no requests and keeps no state. main.lua decides what to show; the tests replace this module with a recorder,
and apps/kindle/dev/preview opens these screens with sample data in the KOReader emulator to see them.

Designed for e-ink: black on white, thick borders instead of shades, large tap targets, no animation, and a full
refresh whenever a new screen opens so the previous one leaves no ghost.
]]
local Blitbuffer = require("ffi/blitbuffer")
local BottomContainer = require("ui/widget/container/bottomcontainer")
local Button = require("ui/widget/button")
local ConfirmBox = require("ui/widget/confirmbox")
local ButtonDialog = require("ui/widget/buttondialog")
local CenterContainer = require("ui/widget/container/centercontainer")
local Device = require("device")
local Font = require("ui/font")
local FrameContainer = require("ui/widget/container/framecontainer")
local Geom = require("ui/geometry")
local GestureRange = require("ui/gesturerange")
local HorizontalGroup = require("ui/widget/horizontalgroup")
local HorizontalSpan = require("ui/widget/horizontalspan")
local ImageWidget = require("ui/widget/imagewidget")
local InfoMessage = require("ui/widget/infomessage")
local InputContainer = require("ui/widget/container/inputcontainer")
local LeftContainer = require("ui/widget/container/leftcontainer")
local LineWidget = require("ui/widget/linewidget")
local Menu = require("ui/widget/menu")
local MultiInputDialog = require("ui/widget/multiinputdialog")
local OverlapGroup = require("ui/widget/overlapgroup")
local ProgressWidget = require("ui/widget/progresswidget")
local RightContainer = require("ui/widget/container/rightcontainer")
local ScrollTextWidget = require("ui/widget/scrolltextwidget")
local TextBoxWidget = require("ui/widget/textboxwidget")
local TextWidget = require("ui/widget/textwidget")
local UIManager = require("ui/uimanager")
local VerticalGroup = require("ui/widget/verticalgroup")
local VerticalSpan = require("ui/widget/verticalspan")
local Screen = Device.screen

local UI = {}

local BLACK, WHITE, PALE, LIGHT, MUTED = Blitbuffer.COLOR_BLACK, Blitbuffer.COLOR_WHITE, Blitbuffer.COLOR_GRAY_E,
    Blitbuffer.COLOR_GRAY_D, Blitbuffer.COLOR_DARK_GRAY

local function px(n) return Screen:scaleBySize(n) end

-- The plugin's folder, wherever KOReader is installed: images ship next to this file.
local PLUGIN_DIR = (debug.getinfo(1, "S").source:match("^@(.*)/") or ".")

--- The TechRat rat, black on white (made from the app's monochrome icon), `height` tall.
local function logo(height)
    return ImageWidget:new{ file = PLUGIN_DIR .. "/logo.png", height = height, width = math.floor(height * 182 / 128) }
end

-- Sizes of the column every screen is laid out in.
local function frame()
    local w, h = Screen:getWidth(), Screen:getHeight()
    local margin = px(22)
    return { w = w, h = h, margin = margin, inner = w - 2 * margin }
end

local function label(str, size, opts)
    opts = opts or {}
    return TextWidget:new{
        text = str,
        face = Font:getFace(opts.bold and "tfont" or "cfont", size),
        fgcolor = opts.color or BLACK,
        max_width = opts.max_width,
    }
end

local function paragraph(str, size, width, opts)
    opts = opts or {}
    return TextBoxWidget:new{
        text = str,
        face = Font:getFace(opts.bold and "tfont" or "cfont", size),
        width = width,
        alignment = opts.align or "left",
        fgcolor = opts.color or BLACK,
        bgcolor = opts.bg or WHITE,
    }
end

--- Text that fits `max_h`, scrolling (drag or swipe) when it is longer.
local function textArea(str, size, width, max_h)
    local box = paragraph(str, size, width)
    if box:getSize().h <= max_h then return box end
    box:free()
    return ScrollTextWidget:new{ text = str, face = Font:getFace("cfont", size), width = width, height = max_h }
end

local function vspace(n) return VerticalSpan:new{ width = px(n) } end
local function hspace(n) return HorizontalSpan:new{ width = px(n) } end
local function rule(width, thickness) return LineWidget:new{ dimen = Geom:new{ w = width, h = px(thickness or 1) } } end

--- `left` and `right` on one line of `width`.
local function split(width, left, right)
    local h = math.max(left:getSize().h, right and right:getSize().h or 0)
    local dimen = Geom:new{ w = width, h = h }
    local group = OverlapGroup:new{ dimen = dimen, LeftContainer:new{ dimen = dimen, left } }
    if right then table.insert(group, RightContainer:new{ dimen = dimen:copy(), right }) end
    return group
end

local function centered(width, widget)
    return CenterContainer:new{ dimen = Geom:new{ w = width, h = widget:getSize().h }, widget }
end

--- Any widget made tappable.
local Tap = InputContainer:extend{ callback = nil }

function Tap:init()
    local size = self[1]:getSize()
    self.dimen = Geom:new{ w = size.w, h = size.h }
    self.ges_events = { TapTechRat = { GestureRange:new{ ges = "tap", range = self.dimen } } }
end

function Tap:onTapTechRat()
    if self.callback then self.callback() end
    return true
end

--- A large card: a bold title and an optional line under it. `primary` cards are black with white text.
local function card(width, title, subtitle, primary, callback)
    local pad, border = px(16), px(primary and 3 or 2)
    local inner = width - 2 * (pad + border)
    local fg, bg = primary and WHITE or BLACK, primary and BLACK or WHITE
    local group = VerticalGroup:new{ align = "left", label(title, 22, { bold = true, max_width = inner, color = fg }) }
    if subtitle then
        table.insert(group, vspace(4))
        table.insert(group, paragraph(subtitle, 15, inner, { color = primary and LIGHT or MUTED, bg = bg }))
    end
    return Tap:new{
        callback = callback,
        FrameContainer:new{
            width = width, bordersize = border, radius = px(10), padding = pad,
            background = bg, group,
        },
    }
end

--- One answer option: the letter in a square and the text. `state` is nil, "selected", "correct" or "wrong".
local function option(width, letter, text, state)
    local badge_size, pad = px(46), px(12)
    local border = px(state and 3 or 1)
    local text_w = width - badge_size - px(14) - 2 * (pad + border)
    local filled = state == "selected" or state == "correct"
    local badge = FrameContainer:new{
        width = badge_size, height = badge_size, bordersize = px(2), radius = px(6), padding = 0,
        background = filled and BLACK or WHITE,
        CenterContainer:new{
            dimen = Geom:new{ w = badge_size - px(4), h = badge_size - px(4) },
            label(letter, 20, { bold = true, color = filled and WHITE or BLACK }),
        },
    }
    return FrameContainer:new{
        width = width, bordersize = border, radius = px(10), padding = pad,
        background = state == "wrong" and PALE or WHITE,
        HorizontalGroup:new{
            align = "center", badge, hspace(14),
            paragraph(text, 18, text_w, { bold = state == "correct", bg = state == "wrong" and PALE or WHITE }),
        },
    }
end

local function levelBox(width, vm)
    local pad = px(16)
    local inner = width - 2 * (pad + px(2))
    return FrameContainer:new{
        width = width, bordersize = px(2), radius = px(10), padding = pad, background = WHITE,
        VerticalGroup:new{
            align = "left",
            split(inner, label(vm.level_text, 24, { bold = true }), label(vm.xp_text, 20)),
            vspace(10),
            ProgressWidget:new{ width = inner, height = px(16), percentage = vm.level_progress or 0, fillcolor = BLACK, margin_h = 0 },
            vspace(8),
            split(inner, label(vm.next_text or "", 15, { color = MUTED }), label(vm.streak_text or "", 15, { color = MUTED })),
        },
    }
end

--- Buttons along the bottom of a screen: `{ { text, callback, primary, enabled } }`, sharing the width.
local function footer(width, buttons)
    local gap = px(12)
    local each = math.floor((width - gap * (#buttons - 1)) / #buttons)
    local row = HorizontalGroup:new{ align = "center" }
    for i, b in ipairs(buttons) do
        if i > 1 then table.insert(row, HorizontalSpan:new{ width = gap }) end
        table.insert(row, Button:new{
            text = b.text, callback = b.callback, enabled = b.enabled ~= false,
            width = each, bordersize = px(b.primary and 3 or 1), radius = px(8),
            text_font_size = 19, text_font_bold = b.primary == true, padding = px(14),
        })
    end
    return row
end

--- A full-screen page: `body` at the top of the column, `bottom` pinned to the bottom.
local Page = InputContainer:extend{ covers_fullscreen = true, body = nil, bottom = nil }

function Page:init()
    local f = frame()
    self.dimen = Geom:new{ x = 0, y = 0, w = f.w, h = f.h }
    local column = HorizontalGroup:new{ HorizontalSpan:new{ width = f.margin }, self.body }
    local content = OverlapGroup:new{ dimen = Geom:new{ w = f.w, h = f.h }, column }
    if self.bottom then
        table.insert(content, BottomContainer:new{
            dimen = Geom:new{ w = f.w, h = f.h - px(18) },
            self.bottom, -- centred, so it keeps the same margin on both sides
        })
    end
    self[1] = FrameContainer:new{ width = f.w, height = f.h, bordersize = 0, padding = 0, background = WHITE, content }
end

local current

--- Shows `page` in place of the current one. A new screen gets a full refresh; an update of the same one
--- (selecting an option) a quick "ui" refresh.
local function show(page, refresh)
    local previous = current
    current = page
    UIManager:show(page, refresh or "full")
    if previous then UIManager:close(previous) end -- no refresh of its own: the new page covers it
end

--- Closes TechRat's screen (back to KOReader).
function UI.close()
    if current then UIManager:close(current, "full") end
    current = nil
end

--[[ Home. vm: title, hello, signed_in, notice, level_text, xp_text, level_progress, next_text, streak_text, hint,
     cards = { { title, subtitle, primary, callback } }, buttons = { { text, callback, primary } } ]]
function UI.home(vm)
    local f = frame()
    local body = VerticalGroup:new{
        align = "left",
        vspace(22),
        split(f.inner,
            HorizontalGroup:new{ align = "center", logo(px(54)), hspace(12), label(vm.title, 36, { bold = true }) },
            vm.hello and label(vm.hello, 17, { color = MUTED, max_width = math.floor(f.inner / 2) })),
        vspace(8),
        rule(f.inner, 3),
        vspace(20),
    }
    local first = true
    local function add(widget)
        if not first then table.insert(body, vspace(16)) end
        first = false
        table.insert(body, widget)
    end
    if vm.notice then
        local pad = px(14)
        add(FrameContainer:new{
            width = f.inner, bordersize = px(2), radius = px(10), padding = pad, background = PALE,
            paragraph(vm.notice, 17, f.inner - 2 * (pad + px(2)), { bold = true, bg = PALE }),
        })
    end
    if vm.level_text then add(levelBox(f.inner, vm)) end
    if vm.hint then add(paragraph(vm.hint, 19, f.inner)) end
    for _, c in ipairs(vm.cards) do
        add(card(f.inner, c.title, c.subtitle, c.primary, c.callback))
    end
    show(Page:new{ body = body, bottom = footer(f.inner, vm.buttons) })
end

--[[ Question. vm: heading, counter, progress, title, text, options = { { letter, text } }, selected,
     on_select(i), answer_text, on_answer(), quit_text, on_quit() ]]
function UI.question(vm, refresh)
    local f = frame()
    local options = VerticalGroup:new{ align = "left" }
    for i, o in ipairs(vm.options) do
        if i > 1 then table.insert(options, vspace(10)) end
        table.insert(options, Tap:new{
            callback = function() vm.on_select(i) end,
            option(f.inner, o.letter, o.text, vm.selected == i and "selected" or nil),
        })
    end
    local header = VerticalGroup:new{
        align = "left",
        vspace(18),
        split(f.inner, label(vm.heading, 17, { bold = true, max_width = math.floor(f.inner * 0.7) }), label(vm.counter, 17, { bold = true })),
        vspace(8),
        ProgressWidget:new{ width = f.inner, height = px(8), percentage = vm.progress, fillcolor = BLACK, margin_h = 0 },
        vspace(18),
        paragraph(vm.title, 23, f.inner, { bold = true }),
        vspace(8),
    }
    local bottom = footer(f.inner, {
        { text = vm.quit_text, callback = vm.on_quit },
        { text = vm.answer_text, callback = vm.on_answer, primary = true, enabled = vm.selected ~= nil },
    })
    -- The question text takes what the title, the options and the buttons leave free, and scrolls beyond that.
    -- (Measured before building the column: a group caches its layout the first time it is measured.)
    local reserved = header:getSize().h + options:getSize().h + bottom:getSize().h + px(70)
    local body = VerticalGroup:new{
        align = "left",
        header,
        textArea(vm.text, 19, f.inner, math.max(px(80), f.h - reserved)),
        vspace(16),
        options,
    }
    show(Page:new{ body = body, bottom = bottom }, refresh)
end

--[[ Feedback. vm: verdict, xp_text, correct, chosen = { letter, text }, right = { letter, text },
     chosen_label, right_label, explanation_title, explanation, status, buttons ]]
function UI.feedback(vm)
    local f = frame()
    local banner_inner = f.inner - 2 * (px(18) + px(3))
    local body = VerticalGroup:new{
        align = "left",
        vspace(18),
        FrameContainer:new{
            width = f.inner, bordersize = px(3), radius = px(10), padding = px(18), background = BLACK,
            split(banner_inner, label(vm.verdict, 28, { bold = true, color = WHITE }),
                vm.xp_text and label(vm.xp_text, 24, { bold = true, color = WHITE })),
        },
        vspace(18),
    }
    if vm.correct then
        table.insert(body, option(f.inner, vm.chosen.letter, vm.chosen.text, "correct"))
    else
        table.insert(body, label(vm.chosen_label, 15, { color = MUTED }))
        table.insert(body, vspace(4))
        table.insert(body, option(f.inner, vm.chosen.letter, vm.chosen.text, "wrong"))
        if vm.right then
            table.insert(body, vspace(12))
            table.insert(body, label(vm.right_label, 15, { color = MUTED }))
            table.insert(body, vspace(4))
            table.insert(body, option(f.inner, vm.right.letter, vm.right.text, "correct"))
        end
    end
    table.insert(body, vspace(20))
    table.insert(body, label(vm.explanation_title, 19, { bold = true }))
    table.insert(body, vspace(6))
    local bottom = VerticalGroup:new{
        align = "left",
        centered(f.inner, label(vm.status, 15, { color = MUTED })),
        vspace(10),
        footer(f.inner, vm.buttons),
    }
    local reserved = body:getSize().h + bottom:getSize().h + px(50)
    local column = VerticalGroup:new{
        align = "left",
        body,
        textArea(vm.explanation, 18, f.inner, math.max(px(80), f.h - reserved)),
    }
    show(Page:new{ body = column, bottom = bottom })
end

--[[ Summary. vm: title, score, score_caption, xp_text, level_text, xp_total_text, level_progress, next_text,
     streak_text, buttons ]]
function UI.summary(vm)
    local f = frame()
    local body = VerticalGroup:new{
        align = "left",
        vspace(50),
        centered(f.inner, label(vm.title, 26, { bold = true })),
        vspace(28),
        centered(f.inner, label(vm.score, 72, { bold = true })),
        vspace(4),
        centered(f.inner, label(vm.score_caption, 18, { color = MUTED })),
        vspace(28),
        FrameContainer:new{
            width = f.inner, bordersize = px(3), radius = px(10), padding = px(16), background = BLACK,
            centered(f.inner - 2 * (px(16) + px(3)), label(vm.xp_text, 30, { bold = true, color = WHITE })),
        },
        vspace(22),
        levelBox(f.inner, { level_text = vm.level_text, xp_text = vm.xp_total_text, level_progress = vm.level_progress,
            next_text = vm.next_text, streak_text = vm.streak_text }),
    }
    show(Page:new{ body = body, bottom = footer(f.inner, vm.buttons) })
end

--[[ A list (topics, roadmaps, steps). vm: title, items = { { text, detail, enabled, callback } }. KOReader's Menu
     pages long lists on e-ink better than a scrolling list would. ]]
function UI.list(vm)
    local menu
    local items = {}
    for i, it in ipairs(vm.items) do
        items[i] = { text = it.text, mandatory = it.detail, select_enabled = it.enabled ~= false, callback = it.callback }
    end
    menu = Menu:new{
        title = vm.title, item_table = items, covers_fullscreen = true, is_borderless = true, is_popout = false,
        is_enable_shortcut = false, -- no Q/W/E… key badges: a Kindle is used by touch
        close_callback = function() UIManager:close(menu) end,
    }
    UIManager:show(menu, "full")
    return menu
end

--- A short choice (how many questions, start a roadmap): `options = { { text, callback } }`, plus `cancel` text.
function UI.choose(title, options, cancel)
    local dialog
    local row = {}
    for _, o in ipairs(options) do
        row[#row + 1] = { text = o.text, callback = function() UIManager:close(dialog); o.callback() end }
    end
    dialog = ButtonDialog:new{
        title = title,
        buttons = { row, { { text = cancel, callback = function() UIManager:close(dialog) end } } },
    }
    UIManager:show(dialog)
    return dialog
end

function UI.message(text)
    UIManager:show(InfoMessage:new{ text = text })
end

--- A yes/no question. vm: text, ok_text, cancel_text, on_ok(), on_cancel()
function UI.confirm(vm)
    local box = ConfirmBox:new{
        text = vm.text, ok_text = vm.ok_text, cancel_text = vm.cancel_text,
        ok_callback = vm.on_ok, cancel_callback = vm.on_cancel,
    }
    UIManager:show(box)
    return box
end

--- Email and password. vm: title, email, email_hint, password_hint, cancel, submit, on_submit(email, password)
function UI.signIn(vm)
    local dialog
    dialog = MultiInputDialog:new{
        title = vm.title,
        fields = {
            { text = vm.email or "", hint = vm.email_hint },
            { text = "", hint = vm.password_hint, text_type = "password" },
        },
        buttons = { {
            { text = vm.cancel, id = "close", callback = function() UIManager:close(dialog) end },
            { text = vm.submit, is_enter_default = true, callback = function()
                local fields = dialog:getFields()
                local email = (fields[1] or ""):gsub("^%s+", ""):gsub("%s+$", "")
                local password = fields[2] or ""
                if email == "" or password == "" then return end
                UIManager:close(dialog)
                vm.on_submit(email, password)
            end },
        } },
    }
    UIManager:show(dialog)
    dialog:onShowKeyboard()
end

return UI
