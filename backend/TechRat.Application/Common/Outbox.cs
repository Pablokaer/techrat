using System.Text.Json;
using TechRat.Domain.Common;

namespace TechRat.Application.Common;

public static class OutboxEvents
{
    public const string UserProgressChanged = "user.progress-changed";
}

/// <summary>Payload of <see cref="OutboxEvents.UserProgressChanged"/>: something changed that may unlock achievements or move rankings.</summary>
public sealed record UserProgressChanged(Guid UserId, Guid? TopicId, string Cause);

public static class OutboxExtensions
{
    public static void Enqueue<T>(this IAppDbContext db, string type, T payload, DateTimeOffset now) =>
        db.OutboxMessages.Add(new OutboxMessage
        {
            Type = type,
            Payload = JsonSerializer.Serialize(payload),
            OccurredAt = now,
        });
}

/// <summary>Handles one outbox message type. Handlers must be idempotent (at-least-once delivery).</summary>
public interface IOutboxHandler
{
    string Type { get; }
    Task HandleAsync(string payload, CancellationToken ct);
}
