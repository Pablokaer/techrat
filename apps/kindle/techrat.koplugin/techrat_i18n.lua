--[[--
Texts of the TechRat plugin in English and Brazilian Portuguese (every learner-facing text exists in both, see
CLAUDE.md). KOReader's own gettext only knows KOReader's strings, so the plugin carries its own table and follows
KOReader's interface language: any Portuguese variant gets pt-BR, anything else English (the same rule as the web).
]]
local I18n = {}

I18n.texts = {
    en = {
        menu = "TechRat",
        sign_in = "Sign in",
        sign_out = "Sign out",
        signed_out = "Signed out of TechRat.",
        signed_in_as = "Signed in as %s",
        email = "Email",
        password = "Password",
        cancel = "Cancel",
        topics = "Topics",
        roadmaps = "Roadmaps",
        daily = "Daily challenge",
        profile = "My progress",
        loading = "Loading…",
        how_many = "How many questions?",
        questions = "%d questions",
        question_of = "Question %d of %d",
        answer_with = "Choose your answer",
        correct = "Correct!",
        incorrect = "Not quite.",
        correct_answer = "Correct answer: %s) %s",
        xp = "+%d XP",
        next = "Next question",
        results = "See results",
        quit = "Quit",
        summary_title = "Session complete",
        summary = "%d of %d correct · +%d XP",
        progress = "Level %d · %d XP · %d-day streak",
        start_roadmap = "Start this roadmap",
        roadmap_locked = "Finish the prerequisites of this roadmap on techrat.io first.",
        roadmap_started = "Roadmap started. Pick the current step to practise it.",
        step_locked = "locked",
        step_done = "done",
        step_current = "current",
        no_steps = "Nothing to practise in this roadmap right now.",
        sign_in_first = "Sign in to TechRat first.",
        error_network = "Could not reach TechRat. Check the Wi-Fi and try again.",
        error_auth = "Your TechRat session ended. Sign in again.",
        error_login = "Email or password is incorrect.",
        error_unconfirmed = "Confirm your email first: open the link TechRat sent you.",
        error_server = "TechRat answered with an error (%s). Try again later.",
    },
    ["pt-BR"] = {
        menu = "TechRat",
        sign_in = "Entrar",
        sign_out = "Sair",
        signed_out = "Você saiu do TechRat.",
        signed_in_as = "Conectado como %s",
        email = "E-mail",
        password = "Senha",
        cancel = "Cancelar",
        topics = "Temas",
        roadmaps = "Roadmaps",
        daily = "Desafio diário",
        profile = "Meu progresso",
        loading = "Carregando…",
        how_many = "Quantas questões?",
        questions = "%d questões",
        question_of = "Questão %d de %d",
        answer_with = "Escolha sua resposta",
        correct = "Correto!",
        incorrect = "Não foi dessa vez.",
        correct_answer = "Resposta correta: %s) %s",
        xp = "+%d XP",
        next = "Próxima questão",
        results = "Ver resultado",
        quit = "Sair do jogo",
        summary_title = "Sessão concluída",
        summary = "%d de %d corretas · +%d XP",
        progress = "Nível %d · %d XP · sequência de %d dias",
        start_roadmap = "Começar este roadmap",
        roadmap_locked = "Conclua antes os pré-requisitos deste roadmap em techrat.io.",
        roadmap_started = "Roadmap iniciado. Escolha a etapa atual para praticar.",
        step_locked = "bloqueada",
        step_done = "concluída",
        step_current = "atual",
        no_steps = "Nada para praticar neste roadmap agora.",
        sign_in_first = "Entre no TechRat primeiro.",
        error_network = "Não foi possível falar com o TechRat. Confira o Wi-Fi e tente de novo.",
        error_auth = "Sua sessão do TechRat terminou. Entre de novo.",
        error_login = "E-mail ou senha incorretos.",
        error_unconfirmed = "Confirme seu e-mail primeiro: abra o link que o TechRat enviou.",
        error_server = "O TechRat respondeu com um erro (%s). Tente mais tarde.",
    },
}

--- The plugin locale for a KOReader language code ("pt_BR", "en", "C"…).
function I18n.locale(koreader_lang)
    if type(koreader_lang) == "string" and koreader_lang:lower():sub(1, 2) == "pt" then return "pt-BR" end
    return "en"
end

--- A translator for one locale: `t("question_of", 2, 10)`.
function I18n.new(locale)
    local texts = I18n.texts[locale] or I18n.texts.en
    return function(key, ...)
        local text = texts[key] or I18n.texts.en[key] or key
        if select("#", ...) > 0 then return string.format(text, ...) end
        return text
    end
end

return I18n
