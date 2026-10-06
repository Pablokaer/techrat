using System.Globalization;
using Microsoft.EntityFrameworkCore;
using TechRat.Domain.Content;

namespace TechRat.Application.Common;

/// <summary>Supported UI languages. The request language is set by the host's request-localization middleware.</summary>
public static class AppLocales
{
    public const string English = "en";
    public const string PortugueseBrazil = "pt-BR";
    public const string Default = English;
    public static readonly string[] Supported = [English, PortugueseBrazil];

    /// <summary>Supported locale of the current request (or background job), from <see cref="CultureInfo.CurrentUICulture"/>.</summary>
    public static string Current =>
        CultureInfo.CurrentUICulture.TwoLetterISOLanguageName == "pt" ? PortugueseBrazil : English;
}

/// <summary>
/// Server-side user-facing texts (validation and error messages, recommendation reasons, notifications, emails)
/// in every supported locale. <c>Text.Get(Text.Keys.X, args)</c> formats the text in the current locale.
/// </summary>
public static class Text
{
    public static class Keys
    {
        public const string ValidationFailed = "problem.validationFailed";
        public const string ProblemValidation = "problem.title.validation";
        public const string ProblemNotFound = "problem.title.notFound";
        public const string ProblemConflict = "problem.title.conflict";
        public const string ProblemForbidden = "problem.title.forbidden";
        public const string ProblemUnauthorized = "problem.title.unauthorized";
        public const string ProblemBadRequest = "problem.title.badRequest";
        public const string ProblemUnexpected = "problem.title.unexpected";
        public const string ProblemTooManyRequests = "problem.title.tooManyRequests";
        public const string NotFound = "error.notFound";

        public const string InvalidCredentials = "auth.invalidCredentials";
        public const string LockedOut = "auth.lockedOut";
        public const string EmailInvalid = "auth.emailInvalid";
        public const string UsernameInvalid = "auth.usernameInvalid";
        public const string DisplayNameLength = "auth.displayNameLength";
        public const string PasswordRequired = "auth.passwordRequired";
        public const string UsernameTaken = "auth.usernameTaken";
        public const string EmailTaken = "auth.emailTaken";
        public const string BioTooLong = "profile.bioTooLong";
        public const string AvatarHttps = "profile.avatarHttps";

        public const string TopicLeaderboardNeedsTopic = "leaderboard.topicRequired";
        public const string UseDailyChallengeEndpoint = "practice.useDailyEndpoint";
        public const string ChooseQuestions = "practice.chooseQuestions";
        public const string QuestionsUnavailable = "practice.questionsUnavailable";
        public const string QuestionIdsOnlyForLearn = "practice.questionIdsOnlyForLearn";
        public const string NoQuestionsAvailable = "practice.noQuestions";
        public const string QuestionNotInSession = "practice.questionNotInSession";
        public const string OptionNotInQuestion = "practice.optionNotInQuestion";
        public const string AlreadyAnswered = "practice.alreadyAnswered";
        public const string RoadmapLocked = "roadmap.locked";

        public const string RecNextStep = "recommendation.nextStep";
        public const string RecWeakness = "recommendation.weakness";
        public const string RecChallenge = "recommendation.challenge";
        public const string RecExplore = "recommendation.explore";

        public const string AchievementUnlockedTitle = "notification.achievementUnlocked.title";
        public const string AchievementUnlockedBody = "notification.achievementUnlocked.body";

        public const string EmailConfirmSubject = "email.confirm.subject";
        public const string EmailConfirmBody = "email.confirm.body";
        public const string EmailResetSubject = "email.reset.subject";
        public const string EmailResetBody = "email.reset.body";
        public const string EmailResetCodeSubject = "email.resetCode.subject";
        public const string EmailResetCodeBody = "email.resetCode.body";
        public const string EmailTestSubject = "email.test.subject";
        public const string EmailTestBody = "email.test.body";
        public const string EmailNotConfigured = "email.notConfigured";
        public const string EmailDeliveryFailed = "email.deliveryFailed";
        public const string ProblemEmail = "problem.title.email";

        public const string AdminTitleRequiredMax = "admin.titleRequiredMax";
        public const string AdminQuestionTextRequired = "admin.questionTextRequired";
        public const string AdminFourOptions = "admin.fourOptions";
        public const string AdminOneCorrect = "admin.oneCorrect";
        public const string AdminOptionsNotEmpty = "admin.optionsNotEmpty";
        public const string AdminOptionsDistinct = "admin.optionsDistinct";
        public const string AdminReferenceHttps = "admin.referenceHttps";
        public const string AdminXpRange = "admin.xpRange";
        public const string AdminUnknownTopic = "admin.unknownTopic";
        public const string AdminUnknownSubtopicForTopic = "admin.unknownSubtopicForTopic";
        public const string AdminUnknownSubtopic = "admin.unknownSubtopic";
        public const string AdminTopicSlugExists = "admin.topicSlugExists";
        public const string AdminSlugInUse = "admin.slugInUse";
        public const string AdminSubtopicSlugExists = "admin.subtopicSlugExists";
        public const string AdminSlugFormat = "admin.slugFormat";
        public const string AdminNameRequiredMax = "admin.nameRequiredMax";
        public const string AdminRoadmapSlugExists = "admin.roadmapSlugExists";
        public const string AdminModuleNotInRoadmap = "admin.moduleNotInRoadmap";
        public const string AdminModuleRequired = "admin.moduleRequired";
        public const string AdminTitleRequired = "admin.titleRequired";
        public const string AdminRange = "admin.range";
        public const string AdminUnknownModule = "admin.unknownModule";
        public const string AdminModuleAlreadyInRoadmap = "admin.moduleAlreadyInRoadmap";
    }

    // Resource names used in "not found" messages (NotFoundException's first argument).
    private static readonly Dictionary<string, string> PtResources = new()
    {
        ["Daily challenge"] = "Desafio diário",
        ["Practice session"] = "Sessão de prática",
        ["Question"] = "Questão",
        ["Roadmap step"] = "Etapa do roadmap",
        ["Roadmap"] = "Roadmap",
        ["Subtopic"] = "Subtópico",
        ["Topic"] = "Tópico",
        ["Module"] = "Módulo",
        ["User"] = "Usuário",
    };

    public static readonly IReadOnlyDictionary<string, string> En = new Dictionary<string, string>
    {
        [Keys.ValidationFailed] = "One or more validation errors occurred.",
        [Keys.ProblemValidation] = "Validation failed",
        [Keys.ProblemNotFound] = "Not found",
        [Keys.ProblemConflict] = "Conflict",
        [Keys.ProblemForbidden] = "Forbidden",
        [Keys.ProblemUnauthorized] = "Unauthorized",
        [Keys.ProblemBadRequest] = "Bad request",
        [Keys.ProblemUnexpected] = "An unexpected error occurred",
        [Keys.ProblemTooManyRequests] = "Too many requests. Try again in a minute.",
        [Keys.NotFound] = "{0} '{1}' was not found.",

        [Keys.InvalidCredentials] = "Invalid email or password.",
        [Keys.LockedOut] = "Too many failed attempts. Try again later.",
        [Keys.EmailInvalid] = "Enter a valid email address.",
        [Keys.UsernameInvalid] = "Username must be 3-32 characters: letters, numbers or underscore.",
        [Keys.DisplayNameLength] = "Display name must have 2-40 characters.",
        [Keys.PasswordRequired] = "Password is required.",
        [Keys.UsernameTaken] = "This username is taken.",
        [Keys.EmailTaken] = "An account with this email already exists.",
        [Keys.BioTooLong] = "Bio must have at most 280 characters.",
        [Keys.AvatarHttps] = "Avatar must be an https URL.",

        [Keys.TopicLeaderboardNeedsTopic] = "Topic leaderboards require a topic.",
        [Keys.UseDailyChallengeEndpoint] = "Use the daily challenge endpoint to start the daily challenge.",
        [Keys.ChooseQuestions] = "Choose between 1 and 50 questions to answer.",
        [Keys.QuestionsUnavailable] = "Some of the chosen questions are not available.",
        [Keys.QuestionIdsOnlyForLearn] = "Picking questions is only available in Learn sessions.",
        [Keys.NoQuestionsAvailable] = "No questions are available for this selection yet.",
        [Keys.QuestionNotInSession] = "The question does not belong to this session.",
        [Keys.OptionNotInQuestion] = "The option does not belong to this question.",
        [Keys.AlreadyAnswered] = "This question was already answered in this session.",
        [Keys.RoadmapLocked] = "This roadmap is locked. Complete its prerequisites first.",

        [Keys.RecNextStep] = "Next step in your roadmap",
        [Keys.RecWeakness] = "Your accuracy here is {0:0}%",
        [Keys.RecChallenge] = "You're ready for harder questions",
        [Keys.RecExplore] = "Popular starting point",

        [Keys.AchievementUnlockedTitle] = "Achievement unlocked: {0}",
        [Keys.AchievementUnlockedBody] = "{0} +{1} XP",

        [Keys.EmailConfirmSubject] = "Confirm your TechRat account",
        [Keys.EmailConfirmBody] = "<p>Welcome to TechRat!</p><p><a href=\"{0}\">Confirm your email</a></p>",
        [Keys.EmailResetSubject] = "Reset your TechRat password",
        [Keys.EmailResetBody] = "<p>Someone requested a password reset for your TechRat account.</p><p><a href=\"{0}\">Choose a new password</a></p><p>If this wasn't you, ignore this email.</p>",
        [Keys.EmailResetCodeSubject] = "Your TechRat password reset code",
        [Keys.EmailResetCodeBody] = "<p>Your reset code is:</p><pre>{0}</pre>",
        [Keys.EmailTestSubject] = "TechRat SMTP test",
        [Keys.EmailTestBody] = "<p>This is a test email from TechRat.</p><p>If you can read it, email delivery works ({0}:{1}, {2}).</p>",
        [Keys.EmailNotConfigured] = "SMTP is not configured. Set Smtp__Host (and the other Smtp__ settings) and restart the API.",
        [Keys.EmailDeliveryFailed] = "The email could not be sent: {0}",
        [Keys.ProblemEmail] = "Email delivery failed",

        [Keys.AdminTitleRequiredMax] = "Title is required (max 120 chars).",
        [Keys.AdminQuestionTextRequired] = "Question text is required.",
        [Keys.AdminFourOptions] = "Multiple choice questions need exactly 4 options.",
        [Keys.AdminOneCorrect] = "Exactly one option must be correct.",
        [Keys.AdminOptionsNotEmpty] = "Options cannot be empty.",
        [Keys.AdminOptionsDistinct] = "Options must be distinct.",
        [Keys.AdminReferenceHttps] = "Reference must be an https URL.",
        [Keys.AdminXpRange] = "XP must be between 0 and {0}.",
        [Keys.AdminUnknownTopic] = "Unknown topic.",
        [Keys.AdminUnknownSubtopicForTopic] = "Unknown subtopic for this topic.",
        [Keys.AdminUnknownSubtopic] = "Unknown subtopic.",
        [Keys.AdminTopicSlugExists] = "A topic with this slug already exists.",
        [Keys.AdminSlugInUse] = "Slug already in use.",
        [Keys.AdminSubtopicSlugExists] = "Subtopic slug already exists in this topic.",
        [Keys.AdminSlugFormat] = "Slug must be kebab-case (a-z, 0-9, '-').",
        [Keys.AdminNameRequiredMax] = "Name is required (max 80 chars).",
        [Keys.AdminRoadmapSlugExists] = "A roadmap with this slug already exists.",
        [Keys.AdminModuleNotInRoadmap] = "Module does not belong to this roadmap.",
        [Keys.AdminModuleRequired] = "Provide a module or a new module title.",
        [Keys.AdminTitleRequired] = "Title is required.",
        [Keys.AdminRange] = "Must be between {0} and {1}.",
        [Keys.AdminUnknownModule] = "Unknown module.",
        [Keys.AdminModuleAlreadyInRoadmap] = "This module is already in the roadmap.",
    };

    public static readonly IReadOnlyDictionary<string, string> PtBr = new Dictionary<string, string>
    {
        [Keys.ValidationFailed] = "Um ou mais erros de validação ocorreram.",
        [Keys.ProblemValidation] = "Falha na validação",
        [Keys.ProblemNotFound] = "Não encontrado",
        [Keys.ProblemConflict] = "Conflito",
        [Keys.ProblemForbidden] = "Acesso negado",
        [Keys.ProblemUnauthorized] = "Não autenticado",
        [Keys.ProblemBadRequest] = "Requisição inválida",
        [Keys.ProblemUnexpected] = "Ocorreu um erro inesperado",
        [Keys.ProblemTooManyRequests] = "Muitas tentativas. Tente novamente em um minuto.",
        [Keys.NotFound] = "{0} '{1}' não foi encontrado(a).",

        [Keys.InvalidCredentials] = "E-mail ou senha inválidos.",
        [Keys.LockedOut] = "Muitas tentativas sem sucesso. Tente novamente mais tarde.",
        [Keys.EmailInvalid] = "Informe um e-mail válido.",
        [Keys.UsernameInvalid] = "O nome de usuário deve ter de 3 a 32 caracteres: letras, números ou sublinhado.",
        [Keys.DisplayNameLength] = "O nome de exibição deve ter de 2 a 40 caracteres.",
        [Keys.PasswordRequired] = "A senha é obrigatória.",
        [Keys.UsernameTaken] = "Este nome de usuário já está em uso.",
        [Keys.EmailTaken] = "Já existe uma conta com este e-mail.",
        [Keys.BioTooLong] = "A bio deve ter no máximo 280 caracteres.",
        [Keys.AvatarHttps] = "O avatar deve ser uma URL https.",

        [Keys.TopicLeaderboardNeedsTopic] = "O ranking por tópico precisa de um tópico.",
        [Keys.UseDailyChallengeEndpoint] = "Use o endpoint do desafio diário para iniciar o desafio diário.",
        [Keys.ChooseQuestions] = "Escolha de 1 a 50 questões para responder.",
        [Keys.QuestionsUnavailable] = "Algumas das questões escolhidas não estão disponíveis.",
        [Keys.QuestionIdsOnlyForLearn] = "Escolher questões só é possível em sessões do Aprender.",
        [Keys.NoQuestionsAvailable] = "Ainda não há questões disponíveis para esta seleção.",
        [Keys.QuestionNotInSession] = "A questão não pertence a esta sessão.",
        [Keys.OptionNotInQuestion] = "A opção não pertence a esta questão.",
        [Keys.AlreadyAnswered] = "Esta questão já foi respondida nesta sessão.",
        [Keys.RoadmapLocked] = "Este roadmap está bloqueado. Conclua os pré-requisitos primeiro.",

        [Keys.RecNextStep] = "Próxima etapa do seu roadmap",
        [Keys.RecWeakness] = "Sua precisão aqui é de {0:0}%",
        [Keys.RecChallenge] = "Você está pronto para questões mais difíceis",
        [Keys.RecExplore] = "Um ótimo ponto de partida",

        [Keys.AchievementUnlockedTitle] = "Conquista desbloqueada: {0}",
        [Keys.AchievementUnlockedBody] = "{0} +{1} XP",

        [Keys.EmailConfirmSubject] = "Confirme sua conta no TechRat",
        [Keys.EmailConfirmBody] = "<p>Boas-vindas ao TechRat!</p><p><a href=\"{0}\">Confirme seu e-mail</a></p>",
        [Keys.EmailResetSubject] = "Redefina sua senha do TechRat",
        [Keys.EmailResetBody] = "<p>Alguém pediu para redefinir a senha da sua conta no TechRat.</p><p><a href=\"{0}\">Escolha uma nova senha</a></p><p>Se não foi você, ignore este e-mail.</p>",
        [Keys.EmailResetCodeSubject] = "Seu código para redefinir a senha do TechRat",
        [Keys.EmailResetCodeBody] = "<p>Seu código de redefinição é:</p><pre>{0}</pre>",
        [Keys.EmailTestSubject] = "Teste de SMTP do TechRat",
        [Keys.EmailTestBody] = "<p>Este é um e-mail de teste do TechRat.</p><p>Se você está lendo, o envio de e-mails funciona ({0}:{1}, {2}).</p>",
        [Keys.EmailNotConfigured] = "O SMTP não está configurado. Defina Smtp__Host (e as demais configurações Smtp__) e reinicie a API.",
        [Keys.EmailDeliveryFailed] = "Não foi possível enviar o e-mail: {0}",
        [Keys.ProblemEmail] = "Falha no envio de e-mail",

        [Keys.AdminTitleRequiredMax] = "O título é obrigatório (máx. 120 caracteres).",
        [Keys.AdminQuestionTextRequired] = "O enunciado é obrigatório.",
        [Keys.AdminFourOptions] = "Questões de múltipla escolha precisam de exatamente 4 opções.",
        [Keys.AdminOneCorrect] = "Exatamente uma opção deve ser a correta.",
        [Keys.AdminOptionsNotEmpty] = "As opções não podem ficar vazias.",
        [Keys.AdminOptionsDistinct] = "As opções devem ser diferentes entre si.",
        [Keys.AdminReferenceHttps] = "A referência deve ser uma URL https.",
        [Keys.AdminXpRange] = "O XP deve estar entre 0 e {0}.",
        [Keys.AdminUnknownTopic] = "Tópico desconhecido.",
        [Keys.AdminUnknownSubtopicForTopic] = "Subtópico desconhecido para este tópico.",
        [Keys.AdminUnknownSubtopic] = "Subtópico desconhecido.",
        [Keys.AdminTopicSlugExists] = "Já existe um tópico com este slug.",
        [Keys.AdminSlugInUse] = "Este slug já está em uso.",
        [Keys.AdminSubtopicSlugExists] = "Já existe um subtópico com este slug neste tópico.",
        [Keys.AdminSlugFormat] = "O slug deve estar em kebab-case (a-z, 0-9, '-').",
        [Keys.AdminNameRequiredMax] = "O nome é obrigatório (máx. 80 caracteres).",
        [Keys.AdminRoadmapSlugExists] = "Já existe um roadmap com este slug.",
        [Keys.AdminModuleNotInRoadmap] = "O módulo não pertence a este roadmap.",
        [Keys.AdminModuleRequired] = "Informe um módulo ou o título de um novo módulo.",
        [Keys.AdminTitleRequired] = "O título é obrigatório.",
        [Keys.AdminRange] = "Deve estar entre {0} e {1}.",
        [Keys.AdminUnknownModule] = "Módulo desconhecido.",
        [Keys.AdminModuleAlreadyInRoadmap] = "Este módulo já está no roadmap.",
    };

    /// <summary>Formats <paramref name="key"/> in the current locale (falls back to English).</summary>
    public static string Get(string key, params object?[] args) => GetFor(AppLocales.Current, key, args);

    public static string GetFor(string locale, string key, params object?[] args)
    {
        var table = locale == AppLocales.PortugueseBrazil ? PtBr : En;
        var format = table.GetValueOrDefault(key) ?? En.GetValueOrDefault(key) ?? key;
        var culture = CultureInfo.GetCultureInfo(locale == AppLocales.PortugueseBrazil ? AppLocales.PortugueseBrazil : AppLocales.English);
        return args.Length == 0 ? format : string.Format(culture, format, args);
    }

    /// <summary>Localized resource name for "not found" messages.</summary>
    public static string Resource(string resource) =>
        AppLocales.Current == AppLocales.PortugueseBrazil ? PtResources.GetValueOrDefault(resource, resource) : resource;
}

/// <summary>Translations of catalog texts for one locale. Missing entries fall back to the base (English) value.</summary>
public sealed class ContentTranslations(IReadOnlyDictionary<string, string> values)
{
    public static readonly ContentTranslations None = new(new Dictionary<string, string>());

    public static string Key(string entityType, Guid id, string field) => $"{entityType}:{id:N}:{field}";

    public string Get(string entityType, Guid id, string field, string fallback) =>
        values.TryGetValue(Key(entityType, id, field), out var v) && !string.IsNullOrWhiteSpace(v) ? v : fallback;

    public string TopicName(Guid id, string fallback) => Get(TranslatableEntity.Topic, id, TranslatableField.Name, fallback);
    public string TopicDescription(Guid id, string fallback) => Get(TranslatableEntity.Topic, id, TranslatableField.Description, fallback);
    public string TopicCategory(Guid id, string fallback) => Get(TranslatableEntity.Topic, id, TranslatableField.Category, fallback);
    public string SubtopicName(Guid id, string fallback) => Get(TranslatableEntity.Subtopic, id, TranslatableField.Name, fallback);
    public string RoadmapName(Guid id, string fallback) => Get(TranslatableEntity.Roadmap, id, TranslatableField.Name, fallback);
    public string RoadmapDescription(Guid id, string fallback) => Get(TranslatableEntity.Roadmap, id, TranslatableField.Description, fallback);
    public string RoadmapCategory(Guid id, string fallback) => Get(TranslatableEntity.Roadmap, id, TranslatableField.Category, fallback);
    public string ModuleName(Guid id, string fallback) => Get(TranslatableEntity.Module, id, TranslatableField.Name, fallback);
    public string ModuleDescription(Guid id, string fallback) => Get(TranslatableEntity.Module, id, TranslatableField.Description, fallback);
    public string StepTitle(Guid id, string fallback) => Get(TranslatableEntity.ModuleStep, id, TranslatableField.Title, fallback);
    public string StepDescription(Guid id, string fallback) => Get(TranslatableEntity.ModuleStep, id, TranslatableField.Description, fallback);
    public string AchievementName(Guid id, string fallback) => Get(TranslatableEntity.Achievement, id, TranslatableField.Name, fallback);
    public string AchievementDescription(Guid id, string fallback) => Get(TranslatableEntity.Achievement, id, TranslatableField.Description, fallback);
    public string AchievementCategory(Guid id, string fallback) => Get(TranslatableEntity.Achievement, id, TranslatableField.Category, fallback);
    public string QuestionTitle(Guid id, string fallback) => Get(TranslatableEntity.Question, id, TranslatableField.Title, fallback);
    public string QuestionText(Guid id, string fallback) => Get(TranslatableEntity.Question, id, TranslatableField.Text, fallback);
    public string QuestionExplanation(Guid id, string fallback) => Get(TranslatableEntity.Question, id, TranslatableField.Explanation, fallback);
    public string OptionText(Guid id, string fallback) => Get(TranslatableEntity.QuestionOption, id, TranslatableField.Text, fallback);
}

/// <summary>Loads catalog translations for the current locale (cached; English needs none).</summary>
public sealed class ContentLocalizer(IAppDbContext db, ICacheService cache)
{
    // Scoped service: one cache read per locale per request.
    private readonly Dictionary<string, ContentTranslations> _loaded = [];

    public Task<ContentTranslations> LoadAsync(CancellationToken ct) => LoadAsync(AppLocales.Current, ct);

    public async Task<ContentTranslations> LoadAsync(string locale, CancellationToken ct)
    {
        if (locale == AppLocales.Default) return ContentTranslations.None;
        if (_loaded.TryGetValue(locale, out var loaded)) return loaded;
        // Question texts are loaded per session (LoadQuestionsAsync); the cached dictionary holds the small catalog only.
        var values = await cache.GetOrCreateAsync(CacheKeys.Translations(locale), TimeSpan.FromMinutes(10), async c =>
            (await db.ContentTranslations.AsNoTracking()
                .Where(t => t.Locale == locale && t.EntityType != TranslatableEntity.Question && t.EntityType != TranslatableEntity.QuestionOption)
                .Select(t => new { t.EntityType, t.EntityId, t.Field, t.Value }).ToListAsync(c))
            .ToDictionary(t => ContentTranslations.Key(t.EntityType, t.EntityId, t.Field), t => t.Value), ct);
        return _loaded[locale] = new ContentTranslations(values);
    }

    /// <summary>Translations of the given questions and their options in the current locale (straight from the database).</summary>
    public async Task<ContentTranslations> LoadQuestionsAsync(IEnumerable<Guid> questionIds, IEnumerable<Guid> optionIds, CancellationToken ct)
    {
        var locale = AppLocales.Current;
        if (locale == AppLocales.Default) return ContentTranslations.None;
        var qIds = questionIds.Distinct().ToList();
        var oIds = optionIds.Distinct().ToList();
        var rows = await db.ContentTranslations.AsNoTracking()
            .Where(t => t.Locale == locale && ((t.EntityType == TranslatableEntity.Question && qIds.Contains(t.EntityId))
                || (t.EntityType == TranslatableEntity.QuestionOption && oIds.Contains(t.EntityId))))
            .Select(t => new { t.EntityType, t.EntityId, t.Field, t.Value }).ToListAsync(ct);
        return new ContentTranslations(rows.ToDictionary(t => ContentTranslations.Key(t.EntityType, t.EntityId, t.Field), t => t.Value));
    }
}
