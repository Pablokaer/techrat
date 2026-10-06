using TechRat.Domain.Common;

namespace TechRat.Domain.Users;

/// <summary>
/// Learner profile and global game state. Credentials live in the Identity module
/// (ApplicationUser) and share the same Id.
/// </summary>
public sealed class User
{
    public Guid Id { get; set; }
    public required string Username { get; set; }
    public required string DisplayName { get; set; }
    public required string Email { get; set; }
    public string? AvatarUrl { get; set; }
    public string? Bio { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? LastLoginAt { get; set; }

    public int CurrentGlobalLevel { get; set; } = 1;
    public long CurrentGlobalXP { get; set; }
    public int CurrentStreak { get; set; }
    public int LongestStreak { get; set; }
    public DateOnly? LastActivityDate { get; set; }
    public int QuestionsAnswered { get; set; }
    public int CorrectAnswers { get; set; }
    public double GlobalAccuracy { get; set; }
    /// <summary>Snapshot refreshed by background processing; live rank is computed on read.</summary>
    public int GlobalRank { get; set; }

    public void RecordAnswer(bool isCorrect)
    {
        QuestionsAnswered++;
        if (isCorrect) CorrectAnswers++;
        GlobalAccuracy = Math.Round(100.0 * CorrectAnswers / QuestionsAnswered, 2);
    }
}

public sealed class UserTopicProgress
{
    public Guid UserId { get; set; }
    public Guid TopicId { get; set; }
    public long XP { get; set; }
    public int Level { get; set; } = 1;
    public int QuestionsAnswered { get; set; }
    public int CorrectAnswers { get; set; }
    public double Accuracy { get; set; }
    public int EasyAnswered { get; set; }
    public int EasyCorrect { get; set; }
    public int MediumAnswered { get; set; }
    public int MediumCorrect { get; set; }
    public int HardAnswered { get; set; }
    public int HardCorrect { get; set; }
    public int ExpertAnswered { get; set; }
    public int ExpertCorrect { get; set; }
    public DateTimeOffset LastActivityAt { get; set; }

    public void RecordAnswer(Difficulty difficulty, bool isCorrect, DateTimeOffset at)
    {
        QuestionsAnswered++;
        if (isCorrect) CorrectAnswers++;
        Accuracy = Math.Round(100.0 * CorrectAnswers / QuestionsAnswered, 2);
        var c = isCorrect ? 1 : 0;
        switch (difficulty)
        {
            case Difficulty.Easy: EasyAnswered++; EasyCorrect += c; break;
            case Difficulty.Medium: MediumAnswered++; MediumCorrect += c; break;
            case Difficulty.Hard: HardAnswered++; HardCorrect += c; break;
            case Difficulty.Expert: ExpertAnswered++; ExpertCorrect += c; break;
        }
        LastActivityAt = at;
    }
}
