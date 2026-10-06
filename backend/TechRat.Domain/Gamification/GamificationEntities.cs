using TechRat.Domain.Common;

namespace TechRat.Domain.Gamification;

/// <summary>Immutable ledger of every XP change. User/topic XP totals are projections of this ledger.</summary>
public sealed class XPTransaction
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid UserId { get; set; }
    public int Amount { get; set; }
    public XpReason Reason { get; set; }
    public XpSourceType SourceType { get; set; }
    public Guid? SourceId { get; set; }
    public Guid? TopicId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

/// <summary>Rule-based achievement. Its visual representation is the badge (icon + tier).</summary>
public sealed class Achievement
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public required string Code { get; set; }
    public required string Name { get; set; }
    public string Description { get; set; } = "";
    public string Category { get; set; } = "";
    public string Icon { get; set; } = "award";
    public BadgeTier Tier { get; set; }
    public AchievementRuleType RuleType { get; set; }
    public int Threshold { get; set; }
    public string? TargetSlug { get; set; }
    public int? SecondaryThreshold { get; set; }
    public int XPReward { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class UserAchievement
{
    public Guid UserId { get; set; }
    public Guid AchievementId { get; set; }
    public Achievement? Achievement { get; set; }
    public DateTimeOffset UnlockedAt { get; set; }
}

public sealed class Notification
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid UserId { get; set; }
    public required string Type { get; set; }
    public required string Title { get; set; }
    public string Body { get; set; } = "";
    /// <summary>What the notification is about (e.g. the achievement code), so it can be rendered in the reader's language.</summary>
    public string? ReferenceKey { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? ReadAt { get; set; }
}

public static class NotificationTypes
{
    public const string Achievement = "achievement";
}
