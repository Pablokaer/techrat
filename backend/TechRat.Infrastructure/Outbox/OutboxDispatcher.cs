using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using TechRat.Application.Common;
using TechRat.Infrastructure.Persistence;

namespace TechRat.Infrastructure.Outbox;

public sealed class OutboxSignal : IOutboxSignal
{
    private readonly SemaphoreSlim _signal = new(0, 1);

    public void Notify()
    {
        if (_signal.CurrentCount == 0)
        {
            try { _signal.Release(); } catch (SemaphoreFullException) { }
        }
    }

    public Task WaitAsync(TimeSpan timeout, CancellationToken ct) => _signal.WaitAsync(timeout, ct);
}

/// <summary>
/// Polls the transactional outbox (and wakes up immediately when signalled). Rows are claimed with
/// FOR UPDATE SKIP LOCKED so several API instances can run dispatchers safely.
/// </summary>
public sealed class OutboxDispatcher(IServiceScopeFactory scopes, OutboxSignal signal, ILogger<OutboxDispatcher> logger) : BackgroundService
{
    private const int BatchSize = 20;
    private const int MaxAttempts = 5;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            int processed;
            try
            {
                processed = await DispatchBatchAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Outbox dispatch loop failed");
                processed = 0;
            }

            if (processed == 0)
            {
                try { await signal.WaitAsync(TimeSpan.FromSeconds(2), stoppingToken); }
                catch (OperationCanceledException) { break; }
            }
        }
    }

    public async Task<int> DispatchBatchAsync(CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var handlers = scope.ServiceProvider.GetServices<IOutboxHandler>().ToDictionary(h => h.Type);

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var messages = await db.OutboxMessages
            .FromSqlRaw("""
                SELECT * FROM infrastructure.outbox_messages
                WHERE processed_at IS NULL AND attempts < {0}
                ORDER BY occurred_at
                LIMIT {1}
                FOR UPDATE SKIP LOCKED
                """, MaxAttempts, BatchSize)
            .ToListAsync(ct);

        foreach (var message in messages)
        {
            // Each handler runs inside a savepoint so a failure rolls back only its own changes.
            await tx.CreateSavepointAsync("handler", ct);
            try
            {
                if (handlers.TryGetValue(message.Type, out var handler))
                    await handler.HandleAsync(message.Payload, ct);
                else
                    logger.LogWarning("No outbox handler for {OutboxType}", message.Type);
                message.ProcessedAt = DateTimeOffset.UtcNow;
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                await tx.RollbackToSavepointAsync("handler", ct);
                foreach (var entry in db.ChangeTracker.Entries().Where(e => e.Entity is not Domain.Common.OutboxMessage).ToList())
                    entry.State = EntityState.Detached;
                message.Attempts++;
                message.LastError = ex.Message.Length > 2000 ? ex.Message[..2000] : ex.Message;
                logger.LogWarning(ex, "Outbox message {OutboxId} ({OutboxType}) failed, attempt {Attempt}", message.Id, message.Type, message.Attempts);
            }
        }
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return messages.Count;
    }
}
