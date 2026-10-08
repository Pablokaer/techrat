using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TechRat.Application.Common;
using TechRat.Application.Gamification;
using TechRat.Application.Leaderboards;
using TechRat.Domain.Gamification;

namespace TechRat.Application.Notifications;

public sealed record NotificationDto(Guid Id, string Type, string Title, string Body, DateTimeOffset CreatedAt, bool IsRead);

public sealed record NotificationListDto(int UnreadCount, IReadOnlyList<NotificationDto> Items);

public sealed class NotificationService(IAppDbContext db, ContentLocalizer localizer, TimeProvider clock)
{
    public async Task<NotificationListDto> ListAsync(Guid userId, CancellationToken ct)
    {
        var rows = await db.Notifications.AsNoTracking().Where(n => n.UserId == userId).OrderByDescending(n => n.CreatedAt).Take(30)
            .ToListAsync(ct);
        var unread = await db.Notifications.CountAsync(n => n.UserId == userId && n.ReadAt == null, ct);

        // Achievement notifications are rendered in the reader's language; older ones without a code keep their stored text.
        var codes = rows.Where(n => n.Type == NotificationTypes.Achievement && n.ReferenceKey is not null).Select(n => n.ReferenceKey!).Distinct().ToList();
        var achievements = codes.Count == 0 ? [] : await db.Achievements.AsNoTracking().Where(a => codes.Contains(a.Code)).ToDictionaryAsync(a => a.Code, ct);
        var tr = await localizer.LoadAsync(ct);

        var items = rows.Select(n =>
        {
            if (n.Type != NotificationTypes.Achievement || n.ReferenceKey is null || !achievements.TryGetValue(n.ReferenceKey, out var a))
                return new NotificationDto(n.Id, n.Type, n.Title, n.Body, n.CreatedAt, n.ReadAt != null);
            return new NotificationDto(n.Id, n.Type,
                Text.Get(Text.Keys.AchievementUnlockedTitle, tr.AchievementName(a.Id, a.Name)),
                Text.Get(Text.Keys.AchievementUnlockedBody, tr.AchievementDescription(a.Id, a.Description), a.XPReward),
                n.CreatedAt, n.ReadAt != null);
        }).ToList();
        return new NotificationListDto(unread, items);
    }

    public async Task MarkReadAsync(Guid userId, Guid? id, CancellationToken ct)
    {
        var q = db.Notifications.Where(n => n.UserId == userId && n.ReadAt == null);
        if (id is not null) q = q.Where(n => n.Id == id);
        foreach (var n in await q.ToListAsync(ct)) n.ReadAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
    }
}

/// <summary>Secondary work after an answer / roadmap change. Runs in the background, idempotent.</summary>
public sealed class UserProgressChangedHandler(
    IAppDbContext db, AchievementService achievements, LeaderboardService leaderboard, IRealtimePublisher realtime) : IOutboxHandler
{
    public string Type => OutboxEvents.UserProgressChanged;

    public async Task HandleAsync(string payload, CancellationToken ct)
    {
        var evt = JsonSerializer.Deserialize<UserProgressChanged>(payload) ?? throw new InvalidOperationException("Invalid payload");
        // The account may have been deleted while this message waited: there is nothing left to evaluate or notify.
        if (!await db.UserProfiles.AnyAsync(u => u.Id == evt.UserId, ct)) return;
        await achievements.EvaluateAsync(evt.UserId, ct);

        var rank = await leaderboard.GlobalRankAsync(evt.UserId, ct);
        var user = await db.UserProfiles.FirstOrDefaultAsync(u => u.Id == evt.UserId, ct);
        if (user is not null && user.GlobalRank != rank)
        {
            user.GlobalRank = rank;
            await db.SaveChangesAsync(ct);
        }
        await realtime.PublishToUserAsync(evt.UserId, "progressUpdated", new { rank }, ct);
    }
}
