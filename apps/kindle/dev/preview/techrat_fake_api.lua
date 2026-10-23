--[[--
A stand-in for the TechRat API for the emulator preview (dev only, never shipped): answers the requests the plugin
makes with sample data shaped like the real responses, so the screens can be designed and clicked through without an
account or a network. It replaces techrat_transport: `transport(request) -> status, body`.
]]
local state = { answered = 0, correct = 0, xp = 0, total_xp = 2340 }

local ME = {
    username = "pablo", displayName = "Pablo", currentStreak = 12,
    level = { level = 7, totalXp = 2340, xpIntoLevel = 290, xpForThisLevel = 470, xpToNextLevel = 180, progressPercent = 62 },
}

local TOPICS = {
    { slug = "programming-fundamentals", name = "Fundamentos de Programação", category = "Ciência da Computação", questions = { total = 102 } },
    { slug = "data-structures", name = "Estruturas de Dados", category = "Ciência da Computação", questions = { total = 184 } },
    { slug = "algorithms", name = "Algoritmos", category = "Ciência da Computação", questions = { total = 145 } },
    { slug = "system-design", name = "System Design", category = "Arquitetura", questions = { total = 191 } },
    { slug = "backend-engineering", name = "Engenharia de Backend", category = "Engenharia", questions = { total = 53 } },
    { slug = "databases", name = "Bancos de Dados", category = "Dados", questions = { total = 74 } },
    { slug = "csharp", name = "C#", category = "Linguagens", questions = { total = 79 } },
    { slug = "kubernetes", name = "Kubernetes", category = "Cloud e DevOps", questions = { total = 61 } },
}

local ROADMAPS = {
    { slug = "backend-developer", name = "Desenvolvedor Backend", progress = { isStarted = true, percentComplete = 38 } },
    { slug = "system-design", name = "System Design", progress = { isStarted = false } },
    { slug = "devops-engineer", name = "Engenheiro DevOps", progress = nil },
}

local ROADMAP = {
    summary = { slug = "backend-developer", name = "Desenvolvedor Backend", progress = { isStarted = true, percentComplete = 38 } },
    modules = {
        { title = "DNS e HTTP", steps = {
            { id = "st1", title = "Como o DNS resolve um nome", status = "Completed" },
            { id = "st2", title = "Métodos e códigos de status HTTP", status = "Completed" },
        } },
        { title = "APIs REST", steps = {
            { id = "st3", title = "Recursos, verbos e idempotência", status = "Current" },
            { id = "st4", title = "Paginação e versionamento", status = "Locked" },
        } },
        { title = "Bancos de dados", steps = { { id = "st5", title = "Índices e planos de execução", status = "Locked" } } },
    },
}

local QUESTIONS = {
    { id = "Q1", correct = "Q1a", topicName = "Kubernetes", difficulty = "Medium", xpReward = 25,
      title = "O que um Pod agrupa",
      questionText = "No Kubernetes, um Pod é a menor unidade que o cluster agenda. O que ele agrupa?",
      explanation = "Um Pod agrupa um ou mais contêineres que compartilham a mesma rede (um IP) e os mesmos volumes, e que são sempre agendados juntos no mesmo node.",
      options = {
          { id = "Q1a", text = "Um ou mais contêineres que compartilham rede e volumes" },
          { id = "Q1b", text = "Vários nodes de um mesmo cluster" },
          { id = "Q1c", text = "As réplicas de um Deployment em zonas diferentes" },
          { id = "Q1d", text = "Os Services expostos por um namespace" },
      } },
    { id = "Q2", correct = "Q2c", topicName = "Engenharia de Backend", difficulty = "Easy", xpReward = 15,
      title = "Método HTTP idempotente",
      questionText = "Qual destes métodos HTTP é idempotente, isto é, repetir a mesma requisição deixa o servidor no mesmo estado?",
      explanation = "PUT substitui o recurso pelo corpo enviado: enviar a mesma requisição duas vezes deixa o mesmo resultado. POST normalmente cria um novo recurso a cada chamada.",
      options = {
          { id = "Q2a", text = "POST" },
          { id = "Q2b", text = "PATCH com um incremento" },
          { id = "Q2c", text = "PUT" },
          { id = "Q2d", text = "CONNECT" },
      } },
    { id = "Q3", correct = "Q3b", topicName = "Bancos de Dados", difficulty = "Hard", xpReward = 40,
      title = "Índice composto",
      questionText = "Uma tabela tem um índice em (cliente_id, criado_em). Qual consulta não consegue usar esse índice para filtrar?",
      explanation = "Um índice composto é ordenado pela primeira coluna e, dentro dela, pela segunda. Filtrar só por criado_em pula a primeira coluna, então o banco não consegue buscar no índice por esse valor.",
      options = {
          { id = "Q3a", text = "WHERE cliente_id = 42" },
          { id = "Q3b", text = "WHERE criado_em > '2026-01-01'" },
          { id = "Q3c", text = "WHERE cliente_id = 42 AND criado_em > '2026-01-01'" },
          { id = "Q3d", text = "WHERE cliente_id IN (1, 2, 3)" },
      } },
}

local function session(id)
    state.answered, state.correct, state.xp = 0, 0, 0
    local questions = {}
    for i, q in ipairs(QUESTIONS) do
        questions[i] = { id = q.id, title = q.title, questionText = q.questionText, topicName = q.topicName,
            difficulty = q.difficulty, xpReward = q.xpReward, options = q.options }
    end
    return { id = id, totalQuestions = #questions, questions = questions }
end

local function answer(body)
    for _, q in ipairs(QUESTIONS) do
        if q.id == body.questionId then
            local right = body.selectedOptionId == q.correct
            local earned = right and q.xpReward or 0
            state.answered, state.xp, state.total_xp = state.answered + 1, state.xp + earned, state.total_xp + earned
            if right then state.correct = state.correct + 1 end
            return {
                feedback = { isCorrect = right, correctOptionId = q.correct, explanation = q.explanation, xpEarned = earned },
                totalXp = state.total_xp, currentStreak = 12,
                level = { level = 7, totalXp = state.total_xp, progressPercent = math.min(99, 62 + math.floor(state.xp / 5)), xpToNextLevel = math.max(1, 180 - state.xp) },
                session = { answered = state.answered, total = #QUESTIONS, correct = state.correct, xpEarned = state.xp, isComplete = state.answered == #QUESTIONS },
            }
        end
    end
end

return function(req)
    local path = req.url:gsub("^https?://[^/]+", "")
    local route = req.method .. " " .. path
    if route == "POST /api/v1/auth/login" then return 200, { accessToken = "demo", refreshToken = "demo", expiresIn = 315360000 } end
    if route == "POST /api/v1/auth/refresh" then return 200, { accessToken = "demo", refreshToken = "demo", expiresIn = 315360000 } end
    if route == "POST /api/v1/auth/logout" then return 204, nil end
    if route == "GET /api/v1/users/me" then return 200, ME end
    if route == "GET /api/v1/topics" then return 200, TOPICS end
    if route == "GET /api/v1/roadmaps" then return 200, ROADMAPS end
    if route == "GET /api/v1/roadmaps/backend-developer" then return 200, ROADMAP end
    if route:match("^GET /api/v1/roadmaps/") then return 200, { summary = { name = "System Design", progress = { isStarted = false } }, modules = {} } end
    if route:match("^POST /api/v1/roadmaps/.+/start$") then return 403, {} end
    if route == "POST /api/v1/practice/sessions" then return 200, session("S1") end
    if route == "POST /api/v1/daily-challenge/start" then return 200, session("D1") end
    local id = path:match("^/api/v1/practice/sessions/([^/]+)/answers$")
    if req.method == "POST" and id then return 200, answer(req.body) end
    return 404, {}
end
