--[[--
The TechRat API as the Kindle needs it: sign in with bearer tokens (the same flow as the Android app), keep the
session alive and call the practice endpoints. The server grades every answer (ADR-0007); this module only carries
requests.

It does not depend on KOReader. The network, the clock and where tokens are kept are passed in, so the tests can
replace them:
  transport(request) -> status, body, err   request = { method, url, headers, body (table or nil) }
                                            status is nil when nothing answered (no Wi-Fi, DNS, TLS, timeout)
  clock() -> seconds
  save_tokens(tokens or nil)                called whenever the tokens change, to persist them

Errors are returned, never thrown, as `nil, kind[, status]`: "network", "auth" (sign in again), "login" (wrong
email or password), "email_not_confirmed", "not_found", "forbidden" or "server".
]]
local Api = {}
Api.__index = Api

-- Renew a little before the access token expires, so a request never travels with a token that dies on the way.
local REFRESH_MARGIN = 60

function Api.new(opts)
    return setmetatable({
        base_url = (opts.base_url or "https://techrat.io"):gsub("/+$", ""),
        locale = opts.locale or "en",
        transport = opts.transport,
        tokens = opts.tokens,
        save_tokens = opts.save_tokens or function() end,
        clock = opts.clock or os.time,
    }, Api)
end

function Api:isSignedIn()
    return self.tokens ~= nil
end

function Api:_setTokens(tokens)
    self.tokens = tokens
    self.save_tokens(tokens)
end

function Api:_send(method, path, body, token)
    local headers = { Accept = "application/json", ["Accept-Language"] = self.locale }
    if token then headers.Authorization = "Bearer " .. token end
    return self.transport({ method = method, url = self.base_url .. path, headers = headers, body = body })
end

local function tokensFrom(body, now)
    if type(body) ~= "table" or type(body.accessToken) ~= "string" or type(body.refreshToken) ~= "string" then return nil end
    return { access = body.accessToken, refresh = body.refreshToken, expires_at = now + (tonumber(body.expiresIn) or 0) }
end

--- Signs in. Returns true, or false and the error kind.
function Api:login(email, password)
    local status, body = self:_send("POST", "/api/v1/auth/login", { email = email, password = password })
    if status == nil then return false, "network" end
    if status == 401 then return false, "login" end
    if status == 403 then return false, "email_not_confirmed" end
    local tokens = status == 200 and tokensFrom(body, self.clock())
    if not tokens then return false, "server" end
    self:_setTokens(tokens)
    return true
end

--- Exchanges the refresh token for new tokens (each refresh token works once, ADR-0030). False when it cannot.
function Api:refresh()
    if not self.tokens then return false end
    local status, body = self:_send("POST", "/api/v1/auth/refresh", { refreshToken = self.tokens.refresh })
    if status == nil then return false, "network" end
    local tokens = status == 200 and tokensFrom(body, self.clock())
    if not tokens then
        self:_setTokens(nil)
        return false, "auth"
    end
    self:_setTokens(tokens)
    return true
end

--- Signs out: tells the server (best effort, an offline Kindle still forgets the tokens) and forgets them.
function Api:logout()
    if self.tokens then self:_send("POST", "/api/v1/auth/logout", nil, self.tokens.access) end
    self:_setTokens(nil)
end

local function failure(status)
    if status == 404 then return nil, "not_found", status end
    if status == 403 then return nil, "forbidden", status end
    return nil, "server", status
end

--- An authenticated request. Returns the decoded body (true when there is none), or nil and the error kind.
function Api:request(method, path, body)
    if not self.tokens then return nil, "auth" end
    if self.tokens.expires_at - REFRESH_MARGIN <= self.clock() then
        local ok, err = self:refresh()
        if not ok then return nil, err end
    end
    local status, data = self:_send(method, path, body, self.tokens.access)
    if status == 401 then
        local ok, err = self:refresh()
        if not ok then return nil, err end
        status, data = self:_send(method, path, body, self.tokens.access)
    end
    if status == nil then return nil, "network" end
    if status == 401 then
        self:_setTokens(nil)
        return nil, "auth"
    end
    if status >= 400 then return failure(status) end
    -- A success without a body (204) is still a success: callers test the first value.
    if data == nil then return true end
    return data
end

function Api:me() return self:request("GET", "/api/v1/users/me") end
function Api:topics() return self:request("GET", "/api/v1/topics") end
function Api:roadmaps() return self:request("GET", "/api/v1/roadmaps") end
function Api:roadmap(slug) return self:request("GET", "/api/v1/roadmaps/" .. slug) end
function Api:startRoadmap(slug) return self:request("POST", "/api/v1/roadmaps/" .. slug .. "/start") end
function Api:startPractice(req) return self:request("POST", "/api/v1/practice/sessions", req) end
function Api:startDailyChallenge() return self:request("POST", "/api/v1/daily-challenge/start") end

function Api:answer(session_id, question_id, option_id, seconds)
    return self:request("POST", "/api/v1/practice/sessions/" .. session_id .. "/answers",
        { questionId = question_id, selectedOptionId = option_id, timeSpentSeconds = seconds })
end

return Api
