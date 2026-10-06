using TechRat.Application.Common;
using TechRat.Domain.Common;
using TechRat.Domain.Gamification;
using TechRat.Domain.Users;

namespace TechRat.Application.Gamification;

public sealed record XpAwardResult(int Amount, bool LeveledUp, int NewLevel, bool TopicLeveledUp, int? NewTopicLevel);

/// <summary>
/// Records XP in the ledger and updates the user's (and optionally topic's) projections.
/// Does not call SaveChanges: callers own the unit of work.
/// </summary>
public sealed class XpService(IAppDbContext db, LevelService levels, TimeProvider clock)
{
    public XpAwardResult Award(
        User user, int amount, XpReason reason, XpSourceType sourceType, Guid? sourceId,
        UserTopicProgress? topicProgress = null)
    {
        if (amount <= 0) return new XpAwardResult(0, false, user.CurrentGlobalLevel, false, topicProgress?.Level);

        db.XPTransactions.Add(new XPTransaction
        {
            UserId = user.Id,
            Amount = amount,
            Reason = reason,
            SourceType = sourceType,
            SourceId = sourceId,
            TopicId = topicProgress?.TopicId,
            CreatedAt = clock.GetUtcNow(),
        });

        var previousLevel = user.CurrentGlobalLevel;
        user.CurrentGlobalXP += amount;
        user.CurrentGlobalLevel = levels.LevelFor(user.CurrentGlobalXP);

        bool topicLeveled = false;
        if (topicProgress is not null)
        {
            var previousTopicLevel = topicProgress.Level;
            topicProgress.XP += amount;
            topicProgress.Level = levels.LevelFor(topicProgress.XP);
            topicLeveled = topicProgress.Level > previousTopicLevel;
        }

        return new XpAwardResult(amount, user.CurrentGlobalLevel > previousLevel, user.CurrentGlobalLevel, topicLeveled, topicProgress?.Level);
    }
}
