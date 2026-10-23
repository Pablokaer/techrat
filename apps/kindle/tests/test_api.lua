local Api = require("techrat_api")

local tests = {}

--- A stand-in for the network: answers each request with the next scripted response for "METHOD path".
local function fake(script)
    local f = { calls = {} }
    function f.transport(req)
        local path = req.url:gsub("^https://techrat%.test", "")
        f.calls[#f.calls + 1] = { method = req.method, path = path, headers = req.headers, body = req.body }
        local queue = script[req.method .. " " .. path]
        local resp = queue and table.remove(queue, 1)
        if not resp then return nil, nil, "connection refused" end
        return resp[1], resp[2]
    end
    return f
end

local function client(script, opts)
    opts = opts or {}
    local net, saved, now = fake(script), { value = "untouched" }, opts.now or 1000
    local api = Api.new({
        base_url = "https://techrat.test", locale = opts.locale or "en", transport = net.transport,
        tokens = opts.tokens, save_tokens = function(v) saved.value = v end, clock = function() return now end,
    })
    return api, net, saved
end

local fresh = { access = "A1", refresh = "R1", expires_at = 5000 }

function tests.login_sends_the_credentials_and_keeps_the_tokens_until_they_expire(t)
    local api, net, saved = client({ ["POST /api/v1/auth/login"] = { { 200, { accessToken = "A", refreshToken = "R", expiresIn = 1800 } } } })
    t.eq({ api:login("me@x.io", "pw") }, { true }, "login result")
    t.eq(net.calls[1].body, { email = "me@x.io", password = "pw" }, "body")
    t.eq(net.calls[1].headers["Accept-Language"], "en", "language header")
    t.eq(saved.value, { access = "A", refresh = "R", expires_at = 2800 }, "saved tokens")
    t.ok(api:isSignedIn(), "signed in")
end

function tests.login_tells_a_wrong_password_from_an_unconfirmed_email(t)
    local api = client({ ["POST /api/v1/auth/login"] = { { 401, {} }, { 403, {} } } })
    t.eq({ api:login("me@x.io", "bad") }, { false, "login" }, "401")
    t.eq({ api:login("me@x.io", "pw") }, { false, "email_not_confirmed" }, "403")
    t.ok(not api:isSignedIn(), "still signed out")
end

function tests.requests_carry_the_bearer_token_and_the_language(t)
    local api, net = client({ ["GET /api/v1/topics"] = { { 200, { { slug = "kubernetes" } } } } }, { tokens = fresh, locale = "pt-BR" })
    t.eq(api:topics(), { { slug = "kubernetes" } }, "topics")
    t.eq(net.calls[1].headers.Authorization, "Bearer A1", "authorization")
    t.eq(net.calls[1].headers["Accept-Language"], "pt-BR", "language")
end

function tests.a_token_about_to_expire_is_renewed_before_the_request(t)
    local api, net, saved = client({
        ["POST /api/v1/auth/refresh"] = { { 200, { accessToken = "A2", refreshToken = "R2", expiresIn = 1800 } } },
        ["GET /api/v1/users/me"] = { { 200, { username = "rat" } } },
    }, { tokens = { access = "A1", refresh = "R1", expires_at = 1030 } })
    t.eq(api:me(), { username = "rat" }, "me")
    t.eq(net.calls[1].body, { refreshToken = "R1" }, "refresh body")
    t.eq(net.calls[2].headers.Authorization, "Bearer A2", "new token used")
    t.eq(saved.value, { access = "A2", refresh = "R2", expires_at = 2800 }, "rotated tokens saved")
end

function tests.a_rejected_token_is_renewed_once_and_the_request_retried(t)
    local api, net = client({
        ["GET /api/v1/topics"] = { { 401, {} }, { 200, {} } },
        ["POST /api/v1/auth/refresh"] = { { 200, { accessToken = "A2", refreshToken = "R2", expiresIn = 1800 } } },
    }, { tokens = fresh })
    t.eq(api:topics(), {}, "topics after retry")
    t.eq(#net.calls, 3, "request, refresh, retry")
end

function tests.when_the_session_cannot_be_renewed_the_learner_must_sign_in_again(t)
    local api, _, saved = client({
        ["GET /api/v1/topics"] = { { 401, {} } },
        ["POST /api/v1/auth/refresh"] = { { 401, {} } },
    }, { tokens = fresh })
    t.eq({ api:topics() }, { nil, "auth" }, "error")
    t.eq(saved.value, nil, "tokens cleared")
    t.ok(not api:isSignedIn(), "signed out")
end

function tests.network_and_server_failures_are_reported_apart(t)
    local api = client({ ["GET /api/v1/topics"] = { { 500, {} } } }, { tokens = fresh })
    t.eq({ api:topics() }, { nil, "server", 500 }, "500")
    t.eq({ api:topics() }, { nil, "network" }, "no answer")
end

function tests.without_tokens_nothing_is_sent(t)
    local api, net = client({})
    t.eq({ api:topics() }, { nil, "auth" }, "error")
    t.eq(#net.calls, 0, "no request")
end

function tests.an_answer_is_sent_to_its_session(t)
    local api, net = client({ ["POST /api/v1/practice/sessions/S1/answers"] = { { 200, { feedback = {} } } } }, { tokens = fresh })
    t.eq(api:answer("S1", "Q1", "O2", 12), { feedback = {} }, "result")
    t.eq(net.calls[1].body, { questionId = "Q1", selectedOptionId = "O2", timeSpentSeconds = 12 }, "body")
end

function tests.a_success_without_a_body_is_still_a_success(t)
    local api = client({ ["POST /api/v1/roadmaps/backend/start"] = { { 204, nil } } }, { tokens = fresh })
    t.eq({ api:startRoadmap("backend") }, { true }, "started")
end

function tests.sign_out_forgets_the_tokens(t)
    local api, _, saved = client({ ["POST /api/v1/auth/logout"] = { { 204, nil } } }, { tokens = fresh })
    api:logout()
    t.eq(saved.value, nil, "tokens cleared")
    t.ok(not api:isSignedIn(), "signed out")
end

return tests
