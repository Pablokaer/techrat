using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using TechRat.Domain.Common;
using TechRat.Domain.Content;
using TechRat.Domain.Gamification;
using TechRat.Domain.Practice;
using TechRat.Domain.Roadmaps;
using TechRat.Domain.Users;

namespace TechRat.Application.Common;

/// <summary>
/// Persistence port used by application services. Implemented by the EF Core DbContext in Infrastructure.
/// (Pragmatic choice: application services depend on EF Core's LINQ abstractions instead of per-aggregate repositories.)
/// </summary>
public interface IAppDbContext
{
    DbSet<User> UserProfiles { get; }
    DbSet<UserAvatar> UserAvatars { get; }
    DbSet<Topic> Topics { get; }
    DbSet<Subtopic> Subtopics { get; }
    DbSet<ContentTranslation> ContentTranslations { get; }
    DbSet<Question> Questions { get; }
    DbSet<QuestionOption> QuestionOptions { get; }
    DbSet<QuestionAttempt> QuestionAttempts { get; }
    DbSet<PracticeSession> PracticeSessions { get; }
    DbSet<DailyChallengeCompletion> DailyChallengeCompletions { get; }
    DbSet<UserTopicProgress> UserTopicProgress { get; }
    DbSet<XPTransaction> XPTransactions { get; }
    DbSet<Roadmap> Roadmaps { get; }
    DbSet<LearningModule> LearningModules { get; }
    DbSet<ModuleStep> ModuleSteps { get; }
    DbSet<RoadmapModuleLink> RoadmapModuleLinks { get; }
    DbSet<ModuleDependency> ModuleDependencies { get; }
    DbSet<RoadmapDependency> RoadmapDependencies { get; }
    DbSet<UserRoadmapProgress> UserRoadmapProgress { get; }
    DbSet<UserModuleProgress> UserModuleProgress { get; }
    DbSet<UserModuleStepCompletion> UserModuleStepCompletions { get; }
    DbSet<Achievement> Achievements { get; }
    DbSet<UserAchievement> UserAchievements { get; }
    DbSet<Notification> Notifications { get; }
    DbSet<OutboxMessage> OutboxMessages { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default);
    /// <summary>Detaches all tracked entities (used before retrying after a concurrency conflict).</summary>
    void ClearChanges();
}

public interface ICurrentUser
{
    Guid? UserId { get; }
    bool IsAdmin { get; }
    Guid RequireUserId() => UserId ?? throw new UnauthorizedAccessException();
}

/// <summary>Cache-aside abstraction backed by Redis (or in-memory when Redis is not configured).</summary>
public interface ICacheService
{
    Task<T> GetOrCreateAsync<T>(string key, TimeSpan ttl, Func<CancellationToken, Task<T>> factory, CancellationToken ct = default);
    Task RemoveAsync(string key, CancellationToken ct = default);
}

/// <summary>Security notices about the user's own account.</summary>
public interface IAccountEmailSender
{
    /// <summary>Tells the owner their password changed, with a way out if it wasn't them. Throws <see cref="EmailDeliveryException"/>.</summary>
    Task SendPasswordChangedAsync(string email, CancellationToken ct);
}

/// <summary>Sends a test email so admins can check the SMTP settings of a deployment.</summary>
public interface ITestEmailSender
{
    bool IsConfigured { get; }
    /// <summary>Throws <see cref="EmailDeliveryException"/> when the SMTP server rejects or cannot be reached.</summary>
    Task SendTestAsync(string to, CancellationToken ct);
}

/// <summary>Pushes realtime events to connected clients (SignalR in the API host).</summary>
public interface IRealtimePublisher
{
    Task PublishToUserAsync(Guid userId, string eventName, object payload, CancellationToken ct = default);
}

/// <summary>Signals the outbox dispatcher that new messages are waiting (lowers latency vs pure polling).</summary>
public interface IOutboxSignal
{
    void Notify();
}

public static class CacheKeys
{
    public const string Topics = "catalog:topics:v1";
    public const string Roadmaps = "catalog:roadmaps:v1";
    public static string Translations(string locale) => $"catalog:translations:{locale}:v2";
    public static string Leaderboard(string scope, string? topic, int page, int pageSize) =>
        $"leaderboard:{scope}:{topic ?? "all"}:{page}:{pageSize}";
}
