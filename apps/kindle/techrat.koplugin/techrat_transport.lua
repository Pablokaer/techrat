--[[--
HTTP for techrat_api on the Kindle, with what KOReader ships: luasocket (HTTPS included, as the wallabag plugin uses
it), ltn12 and KOReader's JSON. Requests and responses are Lua tables; bodies travel as JSON.

Returns `status, body`, or `nil, nil, reason` when nothing answered (no Wi-Fi, DNS, TLS or a timeout). KOReader's
JSON turns `null` into a function, so callers check types (`type(x) == "string"`) instead of comparing with nil.
]]
local JSON = require("json")
local http = require("socket.http")
local ltn12 = require("ltn12")
local socket = require("socket")
local socketutil = require("socketutil")

return function(req)
    local payload = req.body and JSON.encode(req.body) or nil
    local headers = {}
    for k, v in pairs(req.headers or {}) do headers[k] = v end
    if payload then headers["Content-Type"] = "application/json" end
    -- POSTs without a body still say so: some servers answer 411 to a POST without Content-Length.
    if payload or req.method ~= "GET" then headers["Content-Length"] = tostring(payload and #payload or 0) end

    local sink = {}
    socketutil:set_timeout(socketutil.LARGE_BLOCK_TIMEOUT, socketutil.LARGE_TOTAL_TIMEOUT)
    local code, resp_headers, status = socket.skip(1, http.request({
        url = req.url,
        method = req.method,
        headers = headers,
        source = payload and ltn12.source.string(payload) or nil,
        sink = ltn12.sink.table(sink),
    }))
    socketutil:reset_timeout()

    if resp_headers == nil then return nil, nil, status or code end
    local text = table.concat(sink)
    local body
    if text ~= "" then
        local ok, decoded = pcall(JSON.decode, text)
        if ok then body = decoded end
    end
    return tonumber(code), body
end
