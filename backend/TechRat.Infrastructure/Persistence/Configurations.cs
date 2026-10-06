using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TechRat.Application.Identity;
using TechRat.Domain.Common;
using TechRat.Domain.Content;
using TechRat.Domain.Gamification;
using TechRat.Domain.Practice;
using TechRat.Domain.Roadmaps;
using TechRat.Domain.Users;

namespace TechRat.Infrastructure.Persistence;

internal static class ConcurrencyExtensions
{
    /// <summary>Uses PostgreSQL's xmin system column as an optimistic concurrency token.</summary>
    public static void HasXminConcurrency<T>(this EntityTypeBuilder<T> b) where T : class =>
        b.Property<uint>("Version").IsRowVersion();
}

internal sealed class UserConfig : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> b)
    {
        b.ToTable("users", "learning");
        b.HasKey(x => x.Id);
        b.Property(x => x.Username).HasMaxLength(32);
        b.Property(x => x.DisplayName).HasMaxLength(40);
        b.Property(x => x.Email).HasMaxLength(256);
        b.Property(x => x.AvatarUrl).HasMaxLength(500);
        b.Property(x => x.Bio).HasMaxLength(280);
        b.HasIndex(x => x.Username).IsUnique();
        b.HasIndex(x => x.CurrentGlobalXP);
        b.HasOne<ApplicationUser>().WithOne().HasForeignKey<User>(x => x.Id).OnDelete(DeleteBehavior.Cascade);
        b.HasXminConcurrency();
    }
}

internal sealed class TopicConfig : IEntityTypeConfiguration<Topic>
{
    public void Configure(EntityTypeBuilder<Topic> b)
    {
        b.ToTable("topics", "content");
        b.Property(x => x.Slug).HasMaxLength(60);
        b.Property(x => x.Name).HasMaxLength(80);
        b.Property(x => x.Category).HasMaxLength(60);
        b.Property(x => x.Icon).HasMaxLength(40);
        b.Property(x => x.Description).HasMaxLength(500);
        b.HasIndex(x => x.Slug).IsUnique();
        b.HasMany(x => x.Subtopics).WithOne(x => x.Topic).HasForeignKey(x => x.TopicId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class SubtopicConfig : IEntityTypeConfiguration<Subtopic>
{
    public void Configure(EntityTypeBuilder<Subtopic> b)
    {
        b.ToTable("subtopics", "content");
        b.Property(x => x.Slug).HasMaxLength(60);
        b.Property(x => x.Name).HasMaxLength(80);
        b.HasIndex(x => new { x.TopicId, x.Slug }).IsUnique();
    }
}

internal sealed class ContentTranslationConfig : IEntityTypeConfiguration<ContentTranslation>
{
    public void Configure(EntityTypeBuilder<ContentTranslation> b)
    {
        b.ToTable("content_translations", "content");
        b.HasKey(x => new { x.EntityType, x.EntityId, x.Locale, x.Field });
        b.Property(x => x.EntityType).HasMaxLength(30);
        b.Property(x => x.Locale).HasMaxLength(10);
        b.Property(x => x.Field).HasMaxLength(30);
        b.Property(x => x.Value).HasMaxLength(1000);
        b.HasIndex(x => x.Locale);
    }
}

internal sealed class QuestionConfig : IEntityTypeConfiguration<Question>
{
    public void Configure(EntityTypeBuilder<Question> b)
    {
        b.ToTable("questions", "content");
        b.Property(x => x.ExternalKey).HasMaxLength(120);
        b.Property(x => x.Title).HasMaxLength(120);
        b.Property(x => x.QuestionText).HasMaxLength(4000);
        b.Property(x => x.Explanation).HasMaxLength(4000);
        b.Property(x => x.ReferenceUrl).HasMaxLength(500);
        b.HasIndex(x => x.ExternalKey).IsUnique();
        b.HasIndex(x => new { x.TopicId, x.Difficulty });
        b.HasIndex(x => x.SubtopicId);
        b.HasIndex(x => x.Difficulty);
        b.HasOne(x => x.Topic).WithMany().HasForeignKey(x => x.TopicId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.Subtopic).WithMany().HasForeignKey(x => x.SubtopicId).OnDelete(DeleteBehavior.Restrict);
        b.HasMany(x => x.Options).WithOne().HasForeignKey(x => x.QuestionId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class QuestionOptionConfig : IEntityTypeConfiguration<QuestionOption>
{
    public void Configure(EntityTypeBuilder<QuestionOption> b)
    {
        b.ToTable("question_options", "content");
        b.Property(x => x.Text).HasMaxLength(1000);
        b.HasIndex(x => new { x.QuestionId, x.DisplayOrder }).IsUnique();
    }
}

internal sealed class QuestionAttemptConfig : IEntityTypeConfiguration<QuestionAttempt>
{
    public void Configure(EntityTypeBuilder<QuestionAttempt> b)
    {
        b.ToTable("question_attempts", "learning");
        b.HasIndex(x => new { x.UserId, x.AnsweredAt });
        b.HasIndex(x => new { x.UserId, x.QuestionId });
        b.HasIndex(x => new { x.UserId, x.TopicId, x.SubtopicId });
        b.HasIndex(x => x.QuestionId);
        b.HasIndex(x => x.AnsweredAt);
        // One answer per question per session (guards double submits).
        b.HasIndex(x => new { x.PracticeSessionId, x.QuestionId }).IsUnique().HasFilter("practice_session_id IS NOT NULL");
        b.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne<Question>().WithMany().HasForeignKey(x => x.QuestionId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<QuestionOption>().WithMany().HasForeignKey(x => x.SelectedOptionId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<PracticeSession>().WithMany().HasForeignKey(x => x.PracticeSessionId).OnDelete(DeleteBehavior.SetNull);
    }
}

internal sealed class PracticeSessionConfig : IEntityTypeConfiguration<PracticeSession>
{
    public void Configure(EntityTypeBuilder<PracticeSession> b)
    {
        b.ToTable("practice_sessions", "learning");
        b.Ignore(x => x.IsComplete);
        b.HasIndex(x => new { x.UserId, x.StartedAt });
        b.HasIndex(x => new { x.UserId, x.Mode, x.ChallengeDate });
        b.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        b.HasXminConcurrency();
    }
}

internal sealed class DailyChallengeCompletionConfig : IEntityTypeConfiguration<DailyChallengeCompletion>
{
    public void Configure(EntityTypeBuilder<DailyChallengeCompletion> b)
    {
        b.ToTable("daily_challenge_completions", "learning");
        b.HasKey(x => new { x.UserId, x.Date });
        b.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class UserTopicProgressConfig : IEntityTypeConfiguration<UserTopicProgress>
{
    public void Configure(EntityTypeBuilder<UserTopicProgress> b)
    {
        b.ToTable("user_topic_progress", "learning");
        b.HasKey(x => new { x.UserId, x.TopicId });
        b.HasIndex(x => new { x.TopicId, x.XP });
        b.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne<Topic>().WithMany().HasForeignKey(x => x.TopicId).OnDelete(DeleteBehavior.Cascade);
        b.HasXminConcurrency();
    }
}

internal sealed class XpTransactionConfig : IEntityTypeConfiguration<XPTransaction>
{
    public void Configure(EntityTypeBuilder<XPTransaction> b)
    {
        b.ToTable("xp_transactions", "gamification");
        b.HasIndex(x => new { x.UserId, x.CreatedAt });
        b.HasIndex(x => x.CreatedAt);
        b.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class RoadmapConfig : IEntityTypeConfiguration<Roadmap>
{
    public void Configure(EntityTypeBuilder<Roadmap> b)
    {
        b.ToTable("roadmaps", "roadmaps");
        b.Property(x => x.Slug).HasMaxLength(80);
        b.Property(x => x.Name).HasMaxLength(120);
        b.Property(x => x.Description).HasMaxLength(1000);
        b.Property(x => x.Category).HasMaxLength(60);
        b.Property(x => x.Icon).HasMaxLength(40);
        b.HasIndex(x => x.Slug).IsUnique();
        b.HasMany(x => x.Modules).WithOne().HasForeignKey(x => x.RoadmapId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.Steps).WithOne().HasForeignKey(x => x.RoadmapId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.Dependencies).WithOne().HasForeignKey(x => x.RoadmapId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class RoadmapModuleConfig : IEntityTypeConfiguration<RoadmapModule>
{
    public void Configure(EntityTypeBuilder<RoadmapModule> b)
    {
        b.ToTable("roadmap_modules", "roadmaps");
        b.Property(x => x.Title).HasMaxLength(120);
        b.HasIndex(x => new { x.RoadmapId, x.Order });
    }
}

internal sealed class RoadmapStepConfig : IEntityTypeConfiguration<RoadmapStep>
{
    public void Configure(EntityTypeBuilder<RoadmapStep> b)
    {
        b.ToTable("roadmap_steps", "roadmaps");
        b.Property(x => x.Title).HasMaxLength(120);
        b.Property(x => x.Description).HasMaxLength(1000);
        b.HasIndex(x => new { x.RoadmapId, x.Order });
        b.HasOne<RoadmapModule>().WithMany().HasForeignKey(x => x.ModuleId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne<Topic>().WithMany().HasForeignKey(x => x.TopicId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<Subtopic>().WithMany().HasForeignKey(x => x.SubtopicId).OnDelete(DeleteBehavior.Restrict);
    }
}

internal sealed class RoadmapDependencyConfig : IEntityTypeConfiguration<RoadmapDependency>
{
    public void Configure(EntityTypeBuilder<RoadmapDependency> b)
    {
        b.ToTable("roadmap_dependencies", "roadmaps");
        b.HasIndex(x => new { x.RoadmapId, x.RequiredRoadmapId }).IsUnique();
        b.HasOne(x => x.RequiredRoadmap).WithMany().HasForeignKey(x => x.RequiredRoadmapId).OnDelete(DeleteBehavior.Restrict);
    }
}

internal sealed class UserRoadmapProgressConfig : IEntityTypeConfiguration<UserRoadmapProgress>
{
    public void Configure(EntityTypeBuilder<UserRoadmapProgress> b)
    {
        b.ToTable("user_roadmap_progress", "roadmaps");
        b.HasIndex(x => new { x.UserId, x.RoadmapId }).IsUnique();
        b.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne<Roadmap>().WithMany().HasForeignKey(x => x.RoadmapId).OnDelete(DeleteBehavior.Cascade);
        b.HasXminConcurrency();
    }
}

internal sealed class UserRoadmapStepCompletionConfig : IEntityTypeConfiguration<UserRoadmapStepCompletion>
{
    public void Configure(EntityTypeBuilder<UserRoadmapStepCompletion> b)
    {
        b.ToTable("user_roadmap_step_completions", "roadmaps");
        b.HasKey(x => new { x.UserId, x.RoadmapStepId });
        b.HasIndex(x => new { x.UserId, x.RoadmapId });
        b.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne<RoadmapStep>().WithMany().HasForeignKey(x => x.RoadmapStepId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class AchievementConfig : IEntityTypeConfiguration<Achievement>
{
    public void Configure(EntityTypeBuilder<Achievement> b)
    {
        b.ToTable("achievements", "gamification");
        b.Property(x => x.Code).HasMaxLength(60);
        b.Property(x => x.Name).HasMaxLength(80);
        b.Property(x => x.Description).HasMaxLength(300);
        b.Property(x => x.TargetSlug).HasMaxLength(80);
        b.HasIndex(x => x.Code).IsUnique();
    }
}

internal sealed class UserAchievementConfig : IEntityTypeConfiguration<UserAchievement>
{
    public void Configure(EntityTypeBuilder<UserAchievement> b)
    {
        b.ToTable("user_achievements", "gamification");
        b.HasKey(x => new { x.UserId, x.AchievementId });
        b.HasOne(x => x.Achievement).WithMany().HasForeignKey(x => x.AchievementId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class NotificationConfig : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> b)
    {
        b.ToTable("notifications", "notifications");
        b.Property(x => x.Type).HasMaxLength(40);
        b.Property(x => x.Title).HasMaxLength(200);
        b.Property(x => x.Body).HasMaxLength(1000);
        b.Property(x => x.ReferenceKey).HasMaxLength(120);
        b.HasIndex(x => new { x.UserId, x.CreatedAt });
        b.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class OutboxConfig : IEntityTypeConfiguration<OutboxMessage>
{
    public void Configure(EntityTypeBuilder<OutboxMessage> b)
    {
        b.ToTable("outbox_messages", "infrastructure");
        b.Property(x => x.Type).HasMaxLength(100);
        b.Property(x => x.Payload).HasColumnType("jsonb");
        b.HasIndex(x => x.OccurredAt).HasFilter("processed_at IS NULL");
    }
}
