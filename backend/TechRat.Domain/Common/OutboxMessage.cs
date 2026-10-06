namespace TechRat.Domain.Common;

/// <summary>
/// Transactional outbox entry. Written in the same transaction as the business change and
/// dispatched asynchronously, so secondary work (achievements, leaderboards, notifications)
/// is reliable without slowing the request. Can later be relayed to Azure Service Bus.
/// </summary>
public sealed class OutboxMessage
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public required string Type { get; set; }
    public required string Payload { get; set; }
    public DateTimeOffset OccurredAt { get; set; }
    public DateTimeOffset? ProcessedAt { get; set; }
    public int Attempts { get; set; }
    public string? LastError { get; set; }
}
