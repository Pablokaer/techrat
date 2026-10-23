--[[
Runs the plugin's tests with LuaJIT, the interpreter KOReader uses: `luajit apps/kindle/tests/run.lua`.

The modules under test (techrat_api, techrat_game, techrat_i18n) do not touch KOReader: the network, the clock and
the settings are passed in, so the tests run on any machine. Each test file returns a table of named functions that
receive the assertion helpers `t`.
]]
local here = (arg and arg[0] or "tests/run.lua"):match("^(.*)[/\\]") or "."
package.path = here .. "/../techrat.koplugin/?.lua;" .. here .. "/?.lua;" .. package.path

local function same(a, b)
    if type(a) ~= type(b) then return false end
    if type(a) ~= "table" then return a == b end
    for k, v in pairs(a) do if not same(v, b[k]) then return false end end
    for k in pairs(b) do if a[k] == nil then return false end end
    return true
end

local function show(v, depth)
    depth = depth or 0
    if type(v) == "string" then return string.format("%q", v) end
    if type(v) ~= "table" or depth > 3 then return tostring(v) end
    local keys = {}
    for k in pairs(v) do keys[#keys + 1] = k end
    table.sort(keys, function(x, y) return tostring(x) < tostring(y) end)
    local parts = {}
    for _, k in ipairs(keys) do parts[#parts + 1] = tostring(k) .. "=" .. show(v[k], depth + 1) end
    return "{" .. table.concat(parts, ", ") .. "}"
end

local t = {}
function t.eq(actual, expected, what)
    if not same(actual, expected) then
        error(string.format("%s: expected %s, got %s", what or "value", show(expected), show(actual)), 2)
    end
end
function t.ok(value, what)
    if not value then error((what or "condition") .. " is false", 2) end
end

local passed, failed = 0, 0
for _, file in ipairs({ "test_i18n", "test_api", "test_game", "test_main" }) do
    local tests = require(file)
    local names = {}
    for name in pairs(tests) do names[#names + 1] = name end
    table.sort(names)
    for _, name in ipairs(names) do
        local ok, err = pcall(tests[name], t)
        if ok then
            passed = passed + 1
        else
            failed = failed + 1
            print(string.format("FAIL %s.%s\n     %s", file, name, tostring(err)))
        end
    end
end
print(string.format("%d passed, %d failed", passed, failed))
if os.exit then os.exit(failed == 0 and 0 or 1) end
