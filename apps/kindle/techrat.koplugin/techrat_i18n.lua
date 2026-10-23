--[[--
Texts of the TechRat plugin in English and Brazilian Portuguese (every learner-facing text exists in both, see
CLAUDE.md). KOReader's own gettext only knows KOReader's strings, so the plugin carries its own table. It follows
KOReader's interface language (any Portuguese variant gets pt-BR, anything else English, the same rule as the web)
until the learner picks a language in TechRat's home.
]]
local I18n = {}

I18n.texts = {
    en = {
        menu = "TechRat",
        sign_in = "Sign in",
        sign_out = "Sign out",
        language = "Language",
        offline_notice = "No connection. Showing your level and XP from last time.",
        wifi_needed = "TechRat needs the internet for this. Turn Wi-Fi on?",
        wifi_turn_on = "Turn Wi-Fi on",
        not_now = "Not now",
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
        hello = "Hi, %s",
        level = "Level %d",
        xp_total = "%d XP",
        xp_to_next = "%d XP to level %d",
        streak_days = "%d-day streak",
        home_hint = "Sign in with your TechRat account to play. Your XP, level and streak are the same as on techrat.io.",
        sign_in_card = "With your techrat.io email and password",
        daily_hint = "Today's questions, with bonus XP",
        topics_hint = "Pick a topic and how many questions",
        roadmaps_hint = "Follow a learning path, one step at a time",
        close = "Close",
        answer = "Answer",
        your_answer = "Your answer",
        right_answer = "Correct answer",
        explanation = "Explanation",
        no_explanation = "No explanation for this question.",
        play_again = "Play again",
        home = "Home",
        score_caption = "correct · %d%% accuracy",
        difficulty_Easy = "Easy",
        difficulty_Medium = "Medium",
        difficulty_Hard = "Hard",
        difficulty_Expert = "Expert",
    },
    ["pt-BR"] = {
        menu = "TechRat",
        sign_in = "Entrar",
        sign_out = "Sair",
        language = "Idioma",
        offline_notice = "Sem conexão. Mostrando seu nível e XP da última vez.",
        wifi_needed = "O TechRat precisa de internet para isso. Ligar o Wi-Fi?",
        wifi_turn_on = "Ligar o Wi-Fi",
        not_now = "Agora não",
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
        hello = "Olá, %s",
        level = "Nível %d",
        xp_total = "%d XP",
        xp_to_next = "%d XP para o nível %d",
        streak_days = "Sequência de %d dias",
        home_hint = "Entre com sua conta do TechRat para jogar. Seu XP, nível e sequência são os mesmos do techrat.io.",
        sign_in_card = "Com o e-mail e a senha do techrat.io",
        daily_hint = "As questões de hoje, com XP bônus",
        topics_hint = "Escolha um tema e quantas questões",
        roadmaps_hint = "Siga uma trilha, uma etapa de cada vez",
        close = "Fechar",
        answer = "Responder",
        your_answer = "Sua resposta",
        right_answer = "Resposta correta",
        explanation = "Explicação",
        no_explanation = "Esta questão não tem explicação.",
        play_again = "Jogar de novo",
        home = "Início",
        score_caption = "corretas · %d%% de acerto",
        difficulty_Easy = "Fácil",
        difficulty_Medium = "Médio",
        difficulty_Hard = "Difícil",
        difficulty_Expert = "Expert",
    },
}

--- The languages a learner can pick in TechRat's home, each named in itself.
I18n.languages = {
    { locale = "en", name = "English" },
    { locale = "pt-BR", name = "Português (Brasil)" },
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
