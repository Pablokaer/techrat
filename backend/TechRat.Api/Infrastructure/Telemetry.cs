using Microsoft.AspNetCore.Identity;
using Npgsql;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

namespace TechRat.Api.Infrastructure;

public static class Telemetry
{
    /// <summary>
    /// OpenTelemetry traces + metrics (ASP.NET Core, HttpClient, Npgsql, runtime). Exported via OTLP when
    /// OTEL_EXPORTER_OTLP_ENDPOINT is set (e.g. an OTel collector or Azure Monitor / Application Insights via the collector).
    /// </summary>
    public static WebApplicationBuilder AddTechRatTelemetry(this WebApplicationBuilder builder)
    {
        var otlp = builder.Configuration["OTEL_EXPORTER_OTLP_ENDPOINT"];
        builder.Services.AddOpenTelemetry()
            .ConfigureResource(r => r.AddService("techrat-api", serviceVersion: typeof(Telemetry).Assembly.GetName().Version?.ToString()))
            .WithTracing(t =>
            {
                t.AddAspNetCoreInstrumentation(o => o.Filter = ctx => !ctx.Request.Path.StartsWithSegments("/health"))
                 .AddHttpClientInstrumentation()
                 .AddNpgsql();
                if (!string.IsNullOrWhiteSpace(otlp)) t.AddOtlpExporter();
            })
            .WithMetrics(m =>
            {
                m.AddAspNetCoreInstrumentation()
                 .AddHttpClientInstrumentation()
                 .AddRuntimeInstrumentation()
                 .AddMeter("Npgsql");
                if (!string.IsNullOrWhiteSpace(otlp)) m.AddOtlpExporter();
            });

        // Allow SignalR WebSocket connections to authenticate bearer clients via the access_token query string.
        builder.Services.Configure<Microsoft.AspNetCore.Authentication.BearerToken.BearerTokenOptions>(IdentityConstants.BearerScheme, o =>
        {
            o.Events.OnMessageReceived = ctx =>
            {
                var token = ctx.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(token) && ctx.HttpContext.Request.Path.StartsWithSegments("/hubs")) ctx.Token = token;
                return Task.CompletedTask;
            };
        });
        return builder;
    }
}
