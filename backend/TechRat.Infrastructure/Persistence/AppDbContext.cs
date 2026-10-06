using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using TechRat.Application.Common;
using TechRat.Application.Identity;
using TechRat.Domain.Common;
using TechRat.Domain.Content;
using TechRat.Domain.Gamification;
using TechRat.Domain.Practice;
using TechRat.Domain.Roadmaps;
using TechRat.Domain.Users;

namespace TechRat.Infrastructure.Persistence;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>(options), IAppDbContext, IDataProtectionKeyContext
{
    public DbSet<User> UserProfiles => Set<User>();
    public DbSet<UserAvatar> UserAvatars => Set<UserAvatar>();
    public DbSet<Topic> Topics => Set<Topic>();
    public DbSet<Subtopic> Subtopics => Set<Subtopic>();
    public DbSet<ContentTranslation> ContentTranslations => Set<ContentTranslation>();
    public DbSet<Question> Questions => Set<Question>();
    public DbSet<QuestionOption> QuestionOptions => Set<QuestionOption>();
    public DbSet<QuestionAttempt> QuestionAttempts => Set<QuestionAttempt>();
    public DbSet<PracticeSession> PracticeSessions => Set<PracticeSession>();
    public DbSet<DailyChallengeCompletion> DailyChallengeCompletions => Set<DailyChallengeCompletion>();
    public DbSet<UserTopicProgress> UserTopicProgress => Set<UserTopicProgress>();
    public DbSet<XPTransaction> XPTransactions => Set<XPTransaction>();
    public DbSet<Roadmap> Roadmaps => Set<Roadmap>();
    public DbSet<LearningModule> LearningModules => Set<LearningModule>();
    public DbSet<ModuleStep> ModuleSteps => Set<ModuleStep>();
    public DbSet<RoadmapModuleLink> RoadmapModuleLinks => Set<RoadmapModuleLink>();
    public DbSet<ModuleDependency> ModuleDependencies => Set<ModuleDependency>();
    public DbSet<RoadmapDependency> RoadmapDependencies => Set<RoadmapDependency>();
    public DbSet<UserRoadmapProgress> UserRoadmapProgress => Set<UserRoadmapProgress>();
    public DbSet<UserModuleProgress> UserModuleProgress => Set<UserModuleProgress>();
    public DbSet<UserModuleStepCompletion> UserModuleStepCompletions => Set<UserModuleStepCompletion>();
    public DbSet<Achievement> Achievements => Set<Achievement>();
    public DbSet<UserAchievement> UserAchievements => Set<UserAchievement>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();
    public DbSet<DataProtectionKey> DataProtectionKeys => Set<DataProtectionKey>();

    public Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default) =>
        Database.BeginTransactionAsync(cancellationToken);

    public void ClearChanges() => ChangeTracker.Clear();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Identity tables live in their own schema to keep module boundaries visible.
        builder.Entity<ApplicationUser>().ToTable("users", "identity");
        builder.Entity<IdentityRole<Guid>>().ToTable("roles", "identity");
        builder.Entity<IdentityUserRole<Guid>>().ToTable("user_roles", "identity");
        builder.Entity<IdentityUserClaim<Guid>>().ToTable("user_claims", "identity");
        builder.Entity<IdentityUserLogin<Guid>>().ToTable("user_logins", "identity");
        builder.Entity<IdentityRoleClaim<Guid>>().ToTable("role_claims", "identity");
        builder.Entity<IdentityUserToken<Guid>>().ToTable("user_tokens", "identity");
        builder.Entity<DataProtectionKey>().ToTable("data_protection_keys", "identity");

        builder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        configurationBuilder.Properties<Difficulty>().HaveConversion<string>().HaveMaxLength(16);
        configurationBuilder.Properties<QuestionType>().HaveConversion<string>().HaveMaxLength(32);
        configurationBuilder.Properties<PracticeMode>().HaveConversion<string>().HaveMaxLength(32);
        configurationBuilder.Properties<XpReason>().HaveConversion<string>().HaveMaxLength(32);
        configurationBuilder.Properties<XpSourceType>().HaveConversion<string>().HaveMaxLength(32);
        configurationBuilder.Properties<RoadmapDifficulty>().HaveConversion<string>().HaveMaxLength(16);
        configurationBuilder.Properties<AchievementRuleType>().HaveConversion<string>().HaveMaxLength(32);
        configurationBuilder.Properties<BadgeTier>().HaveConversion<string>().HaveMaxLength(16);
        configurationBuilder.Properties<ModuleKind>().HaveConversion<string>().HaveMaxLength(16);
    }
}
