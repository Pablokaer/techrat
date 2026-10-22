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

/// <summary>
/// Cache-aside abstraction backed by Redis (or in-memory when Redis is not configured). Callers ask for an entry declared
/// in <see cref="CacheEntries"/>, which carries the key, the TTL and the local-copy policy (ADR-0041). Computed values and
/// stored state are stored in different formats (ADR-0034), so they are different entry types: a
/// <see cref="StateEntry"/> cannot be passed to GetOrCreate, nor a <see cref="ComputedEntry"/> to Get/Set.
/// </summary>
public interface ICacheService
{
    /// <summary>
    /// The cached value, or the factory's result stored for the entry's TTL. Without a local copy every read asks the shared
    /// cache, so a removal is seen by every API instance at once; with one, another instance can serve the old value for
    /// the entry's local TTL. A cache outage runs the factory instead of failing.
    /// </summary>
    Task<T> GetOrCreateAsync<T>(ComputedEntry entry, Func<CancellationToken, Task<T>> factory, CancellationToken ct = default);

    /// <summary>The stored state, or default when there is none (or the cache is down: callers must cope with a miss).</summary>
    Task<T?> GetAsync<T>(StateEntry entry, CancellationToken ct = default);

    /// <summary>Stores state as plain JSON for the entry's TTL. A cache failure is logged, never thrown.</summary>
    Task SetAsync<T>(StateEntry entry, T value, CancellationToken ct = default);

    Task RemoveAsync(CacheEntry entry, CancellationToken ct = default);
}

/// <summary>Security notices about the user's own account.</summary>
public interface IAccountEmailSender
{
    /// <summary>Tells the owner their password changed, with a way out if it wasn't them. Throws <see cref="EmailDeliveryException"/>.</summary>
    Task SendPasswordChangedAsync(string email, CancellationToken ct);

    /// <summary>
    /// Confirms to the former owner that their account and data were deleted. Sent after the deletion, to the address
    /// captured before it, and never stored. Throws <see cref="EmailDeliveryException"/>.
    /// </summary>
    Task SendAccountDeletedAsync(string email, CancellationToken ct);
}

/// <summary>The email sent when someone signs up with an address that already has an account (ADR-0031).</summary>
public interface IRegistrationEmailSender
{
    /// <summary>
    /// Tells the owner that someone tried to create an account with their address, with links to sign in or reset the
    /// password. Throws <see cref="EmailDeliveryException"/>.
    /// </summary>
    Task SendAlreadyRegisteredAsync(string email, CancellationToken ct);
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

/// <summary>
/// One named cache entry: its key and how long it lives. Only <see cref="CacheEntries"/> declares entries (the
/// constructors are internal), so a caller cannot pick its own TTL or key shape (ADR-0041).
/// </summary>
public abstract class CacheEntry
{
    private protected CacheEntry(string key, TimeSpan ttl) => (Key, Ttl) = (key, ttl);

    /// <summary>The key in the shared cache. Existing Redis data depends on it: change it only together with a version bump.</summary>
    public string Key { get; }

    public TimeSpan Ttl { get; }

    public override string ToString() => Key;
}

/// <summary>
/// A value the cache computes on a miss (GetOrCreate, HybridCache's format). <see cref="LocalTtl"/> null means no copy in
/// each instance's memory: required for security state, whose removal must be seen everywhere at once.
/// </summary>
public sealed class ComputedEntry : CacheEntry
{
    internal ComputedEntry(string key, TimeSpan ttl, TimeSpan? localTtl = null) : base(key, ttl) => LocalTtl = localTtl;

    public TimeSpan? LocalTtl { get; }

    public bool KeepsLocalCopy => LocalTtl is not null;
}

/// <summary>
/// State written and read as plain JSON in the shared cache (Get/Set), never kept in local memory. The format is the one
/// the refresh-session state has had since ADR-0030, so state written before a deploy is still read after it.
/// </summary>
public sealed class StateEntry : CacheEntry
{
    internal StateEntry(string key, TimeSpan ttl) : base(key, ttl) { }
}

/// <summary>
/// Every cache entry of the application, declared once with its policy (ADR-0041). <c>CacheEntriesTests</c> pins each one,
/// so a change of key, TTL, local copy or kind is a deliberate change there too.
/// </summary>
public static class CacheEntries
{
    private static readonly TimeSpan CatalogTtl = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan CatalogLocalTtl = TimeSpan.FromMinutes(1);

    /// <summary>Active topics with their question counts, in the base language (one copy for every locale).</summary>
    public static readonly ComputedEntry Topics = new("catalog:topics:v1", CatalogTtl, CatalogLocalTtl);

    /// <summary>Published roadmaps with their links, in the base language.</summary>
    public static readonly ComputedEntry Roadmaps = new("catalog:roadmaps:v1", CatalogTtl, CatalogLocalTtl);

    /// <summary>The catalog translations of one locale (questions excluded: they are loaded per session).</summary>
    public static ComputedEntry Translations(string locale) => new($"catalog:translations:{locale}:v2", CatalogTtl, CatalogLocalTtl);

    /// <summary>
    /// One leaderboard page: 30 s in the shared cache plus a 10 s local copy, so a page can be about 40 s old (ADR-0034).
    /// The service still drops opted-out and deleted learners on every read.
    /// </summary>
    public static ComputedEntry Leaderboard(string scope, string? topic, int page, int pageSize) =>
        new($"leaderboard:{scope}:{topic ?? "all"}:{page}:{pageSize}", TimeSpan.FromSeconds(30), TimeSpan.FromSeconds(10));

    /// <summary>Whether an account still exists. Cached briefly and evicted on deletion, so tokens of deleted accounts stop working at once.</summary>
    public static ComputedEntry AccountExists(Guid userId) => new($"account:exists:{userId:N}", TimeSpan.FromMinutes(2));

    /// <summary>
    /// Marks that an email of this kind ("reset", "confirm", "registered") went to the address with this hash, for
    /// <see cref="Identity.AuthPolicy.ResetEmailCooldown"/>. Shared only, so the limit holds across instances.
    /// </summary>
    public static ComputedEntry EmailThrottle(string purpose, string addressHash) =>
        new($"auth:{purpose}-email:{addressHash}", Identity.AuthPolicy.ResetEmailCooldown);

    /// <summary>The state of one sign-in session for refresh-token rotation (ADR-0030), kept for the refresh lifetime.</summary>
    public static StateEntry RefreshSession(string sessionId) => new($"auth:refresh:{sessionId}", Identity.AuthPolicy.RefreshTokenLifetime);

    /// <summary>The key the Redis health check reads straight from the shared cache. It is never written.</summary>
    public const string HealthProbeKey = "health:ping";
}
