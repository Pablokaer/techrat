using System.Diagnostics;
using System.Security.Claims;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.OpenApi;
using TechRat.Application.Common;

namespace TechRat.Api.Infrastructure;

/// <summary>Maps application exceptions to RFC 9457 problem details. Unexpected errors never leak internals.</summary>
public sealed class AppExceptionHandler(IProblemDetailsService problems, ILogger<AppExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext http, Exception exception, CancellationToken ct)
    {
        var (status, title) = exception switch
        {
            RequestValidationException => (StatusCodes.Status400BadRequest, Text.Get(Text.Keys.ProblemValidation)),
            NotFoundException => (StatusCodes.Status404NotFound, Text.Get(Text.Keys.ProblemNotFound)),
            ConflictException => (StatusCodes.Status409Conflict, Text.Get(Text.Keys.ProblemConflict)),
            ForbiddenException => (StatusCodes.Status403Forbidden, Text.Get(Text.Keys.ProblemForbidden)),
            EmailDeliveryException => (StatusCodes.Status502BadGateway, Text.Get(Text.Keys.ProblemEmail)),
            UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, Text.Get(Text.Keys.ProblemUnauthorized)),
            BadHttpRequestException b => (b.StatusCode, Text.Get(Text.Keys.ProblemBadRequest)),
            _ => (StatusCodes.Status500InternalServerError, Text.Get(Text.Keys.ProblemUnexpected)),
        };

        // Email delivery failures are expected operational errors (already logged by the sender): their message is the
        // provider's reason, which the admin needs to fix the settings, and contains no internals.
        var expected = exception is EmailDeliveryException;
        if (status >= 500 && !expected) logger.LogError(exception, "Unhandled exception");
        else logger.LogInformation("Request failed with {StatusCode}: {Message}", status, exception.Message);

        http.Response.StatusCode = status;
        var details = exception is RequestValidationException v
            ? new HttpValidationProblemDetails(v.Errors) { Status = status, Title = title }
            : new ProblemDetails { Status = status, Title = title, Detail = status >= 500 && !expected ? null : exception.Message };
        details.Extensions["traceId"] = Activity.Current?.TraceId.ToString() ?? http.TraceIdentifier;

        return await problems.TryWriteAsync(new ProblemDetailsContext { HttpContext = http, ProblemDetails = details, Exception = exception });
    }
}

public sealed class OpenApiInfoTransformer : IOpenApiDocumentTransformer
{
    public Task TransformAsync(OpenApiDocument document, OpenApiDocumentTransformerContext context, CancellationToken ct)
    {
        document.Info = new OpenApiInfo
        {
            Title = "TechRat API",
            Version = "v1",
            Description = "Gamified tech learning platform. Authenticate with POST /api/v1/auth/login (bearer) or ?useCookies=true (web).",
        };
        return Task.CompletedTask;
    }
}

public sealed class NotificationsHub : Hub;

public sealed class SignalRRealtimePublisher(IHubContext<NotificationsHub> hub, ILogger<SignalRRealtimePublisher> logger) : IRealtimePublisher
{
    public async Task PublishToUserAsync(Guid userId, string eventName, object payload, CancellationToken ct = default)
    {
        try { await hub.Clients.User(userId.ToString()).SendAsync(eventName, payload, ct); }
        catch (Exception ex) when (ex is not OperationCanceledException) { logger.LogWarning(ex, "Realtime publish failed"); }
    }
}

public sealed class RedisHealthCheck(IConfiguration config, IDistributedCache cache) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(config.GetConnectionString("Redis")))
            return HealthCheckResult.Healthy("Redis not configured (in-memory cache).");
        try
        {
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(2));
            await cache.GetAsync("health:ping", cts.Token);
            return HealthCheckResult.Healthy();
        }
        catch (Exception ex)
        {
            // Redis is an optimisation (cache); PostgreSQL remains the source of truth, so report degraded.
            return HealthCheckResult.Degraded("Redis unreachable", ex);
        }
    }
}

public sealed class SecurityHeadersMiddleware(RequestDelegate next)
{
    public Task InvokeAsync(HttpContext ctx)
    {
        var h = ctx.Response.Headers;
        h["X-Content-Type-Options"] = "nosniff";
        h["X-Frame-Options"] = "DENY";
        h["Referrer-Policy"] = "no-referrer";
        h["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
        if (!ctx.Request.Path.StartsWithSegments("/docs") && !ctx.Request.Path.StartsWithSegments("/scalar"))
            h["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'";
        return next(ctx);
    }
}

/// <summary>One structured log line per request (no bodies, tokens or secrets).</summary>
public sealed class RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        var start = Stopwatch.GetTimestamp();
        try
        {
            await next(ctx);
        }
        finally
        {
            if (!ctx.Request.Path.StartsWithSegments("/health"))
            {
                var endpoint = (ctx.GetEndpoint() as RouteEndpoint)?.RoutePattern.RawText ?? ctx.Request.Path.Value;
                logger.LogInformation("HTTP {Method} {Endpoint} responded {StatusCode} in {DurationMs:0.0} ms (TraceId {TraceId}, UserId {UserId})",
                    ctx.Request.Method, endpoint, ctx.Response.StatusCode, Stopwatch.GetElapsedTime(start).TotalMilliseconds,
                    Activity.Current?.TraceId.ToString() ?? ctx.TraceIdentifier, ctx.User.FindFirstValue(ClaimTypes.NameIdentifier));
            }
        }
    }
}
