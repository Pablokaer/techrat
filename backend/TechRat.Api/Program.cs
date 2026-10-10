using System.Globalization;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Localization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.SignalR;
using Scalar.AspNetCore;
using TechRat.Api.Infrastructure;
using TechRat.Application;
using TechRat.Application.Common;
using TechRat.Application.Identity;
using TechRat.Infrastructure;
using TechRat.Infrastructure.Persistence;
using TechRat.Modules.Common;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

// ---------------------------------------------------------------- logging & telemetry
builder.Logging.ClearProviders();
if (builder.Environment.IsDevelopment()) builder.Logging.AddSimpleConsole(o => { o.SingleLine = true; o.IncludeScopes = true; });
else builder.Logging.AddJsonConsole(o => { o.IncludeScopes = true; o.UseUtcTimestamp = true; });
builder.AddTechRatTelemetry();

// ---------------------------------------------------------------- modules
builder.Services.AddApplication(config);
builder.Services.AddInfrastructure(config);
builder.Services.AddModules();
builder.Services.AddSingleton<IRealtimePublisher, SignalRRealtimePublisher>();

// ---------------------------------------------------------------- identity & auth
// The key ring that signs login cookies and tokens is stored in PostgreSQL; a certificate kept outside the database
// encrypts it at rest (ADR-0029). Without one the keys are plain XML, which the start-up warning below points out.
var keyRing = builder.Services.AddDataProtection().PersistKeysToDbContext<AppDbContext>().SetApplicationName("TechRat");
var keyEncryptionCertificate = DataProtectionSetup.LoadKeyEncryptionCertificate(config);
if (keyEncryptionCertificate is not null) keyRing.ProtectKeysWithCertificate(keyEncryptionCertificate);
builder.Services
    .AddIdentityApiEndpoints<ApplicationUser>(o =>
    {
        o.User.RequireUniqueEmail = true;
        o.Password.RequiredLength = AuthPolicy.MinPasswordLength;
        o.Password.RequireDigit = true;
        o.Password.RequireLowercase = true;
        o.Password.RequireUppercase = true;
        o.Password.RequireNonAlphanumeric = false;
        o.Lockout.MaxFailedAccessAttempts = AuthPolicy.MaxFailedAccessAttempts;
        o.Lockout.DefaultLockoutTimeSpan = AuthPolicy.LockoutDuration;
    })
    .AddRoles<IdentityRole<Guid>>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddPasswordValidator<PasswordPolicyValidator>()
    .AddErrorDescriber<LocalizedIdentityErrorDescriber>();
// The emailed reset link is short-lived (Identity's default is a day).
builder.Services.Configure<DataProtectionTokenProviderOptions>(o => o.TokenLifespan = AuthPolicy.PasswordResetTokenLifetime);

// ---------------------------------------------------------------- localization
// The client sends Accept-Language (en or pt-BR); any Portuguese variant maps to pt-BR texts.
builder.Services.Configure<RequestLocalizationOptions>(o =>
{
    var cultures = new[] { AppLocales.English, AppLocales.PortugueseBrazil, "pt" }.Select(c => new CultureInfo(c)).ToList();
    o.DefaultRequestCulture = new RequestCulture(AppLocales.Default);
    o.SupportedCultures = cultures;
    o.SupportedUICultures = cultures;
    o.ApplyCurrentCultureToResponseHeaders = true;
});

builder.Services.Configure<Microsoft.AspNetCore.Authentication.BearerToken.BearerTokenOptions>(IdentityConstants.BearerScheme, o =>
{
    o.BearerTokenExpiration = AuthPolicy.AccessTokenLifetime;
    o.RefreshTokenExpiration = AuthPolicy.RefreshTokenLifetime;
});
builder.Services.ConfigureApplicationCookie(o =>
{
    o.Cookie.Name = "techrat.auth";
    o.Cookie.HttpOnly = true;
    o.Cookie.SameSite = SameSiteMode.Strict;
    o.Cookie.SecurePolicy = builder.Environment.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
    o.ExpireTimeSpan = AuthPolicy.RefreshTokenLifetime;
    o.SlidingExpiration = true;
    // APIs answer with status codes instead of redirecting to a login page.
    o.Events.OnRedirectToLogin = ctx => { ctx.Response.StatusCode = StatusCodes.Status401Unauthorized; return Task.CompletedTask; };
    o.Events.OnRedirectToAccessDenied = ctx => { ctx.Response.StatusCode = StatusCodes.Status403Forbidden; return Task.CompletedTask; };
});
builder.Services.Configure<SecurityStampValidatorOptions>(o => o.ValidationInterval = TimeSpan.FromMinutes(5));
builder.Services.AddAuthorizationBuilder()
    .AddPolicy(Policies.Admin, p => p.RequireAuthenticatedUser().RequireRole(Roles.Admin));

// ---------------------------------------------------------------- http
builder.Services.ConfigureHttpJsonOptions(o =>
{
    o.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
    o.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.Never;
    o.SerializerOptions.NumberHandling = JsonNumberHandling.Strict;
});
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<AppExceptionHandler>();
builder.Services.AddOpenApi("v1", o => o.AddDocumentTransformer<OpenApiInfoTransformer>());
builder.Services.AddSignalR().AddJsonProtocol(o => o.PayloadSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

var origins = config.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(origins)
    .WithMethods("GET", "POST", "PUT", "PATCH", "DELETE")
    .WithHeaders("Authorization", "Content-Type", "X-Requested-With", "x-signalr-user-agent")
    .AllowCredentials()));

// ---------------------------------------------------------------- reverse proxy
// Production: Apache -> Next.js (/api proxy) -> API. Take the client address/scheme from X-Forwarded-* so per-client
// limits and logs use the real client. Only private-network proxies are trusted, and only when explicitly enabled;
// otherwise a client could send its own X-Forwarded-For and dodge the limits.
var reverseProxy = config.GetValue("ReverseProxy:Enabled", false);
if (reverseProxy)
    builder.Services.Configure<ForwardedHeadersOptions>(o =>
    {
        o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        o.ForwardLimit = config.GetValue("ReverseProxy:ForwardLimit", 2);
        o.KnownProxies.Clear();
        o.KnownIPNetworks.Clear();
        foreach (var network in new[] { "127.0.0.0/8", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "::1/128", "fc00::/7" })
            o.KnownIPNetworks.Add(System.Net.IPNetwork.Parse(network));
    });

builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.OnRejected = (ctx, _) => ctx.HttpContext.RequestServices.GetRequiredService<IProblemDetailsService>().WriteAsync(new ProblemDetailsContext
    {
        HttpContext = ctx.HttpContext,
        ProblemDetails = { Status = StatusCodes.Status429TooManyRequests, Title = Text.Get(Text.Keys.ProblemTooManyRequests) },
    });
    string Partition(HttpContext ctx) => ctx.User.Identity?.IsAuthenticated == true
        ? ctx.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value
        : ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    o.AddPolicy("auth", ctx => RateLimitPartition.GetFixedWindowLimiter(Partition(ctx),
        _ => new FixedWindowRateLimiterOptions { PermitLimit = config.GetValue("RateLimiting:AuthPerMinute", 20), Window = TimeSpan.FromMinutes(1) }));
    o.AddPolicy("uploads", ctx => RateLimitPartition.GetFixedWindowLimiter(Partition(ctx),
        _ => new FixedWindowRateLimiterOptions { PermitLimit = config.GetValue("RateLimiting:UploadsPerMinute", 10), Window = TimeSpan.FromMinutes(1) }));
    o.AddPolicy("answers", ctx => RateLimitPartition.GetTokenBucketLimiter(Partition(ctx),
        _ => new TokenBucketRateLimiterOptions { TokenLimit = config.GetValue("RateLimiting:AnswersPerMinute", 30), TokensPerPeriod = config.GetValue("RateLimiting:AnswersPerMinute", 30), ReplenishmentPeriod = TimeSpan.FromMinutes(1), AutoReplenishment = true }));
});

builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>("postgres", tags: ["ready"])
    .AddCheck<RedisHealthCheck>("redis", tags: ["ready"]);

var app = builder.Build();

if (keyEncryptionCertificate is null && !app.Environment.IsDevelopment())
    app.Logger.LogWarning("Data Protection keys are stored unencrypted in the database: set DataProtection:CertificateBase64 (or " +
                          "DataProtection:CertificatePath) and DataProtection:CertificatePassword so a leaked backup cannot be used to forge sessions (ADR-0029)");

// ---------------------------------------------------------------- database
if (config.GetValue("Database:MigrateOnStartup", false))
    await app.Services.InitializeDatabaseAsync(seed: config.GetValue("Database:SeedOnStartup", true));

// ---------------------------------------------------------------- pipeline
if (reverseProxy) app.UseForwardedHeaders();
app.UseRequestLocalization();
app.UseExceptionHandler();
app.UseStatusCodePages();
if (!app.Environment.IsDevelopment()) app.UseHsts();
app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseMiddleware<NoStoreMiddleware>();
app.UseMiddleware<SmallBodyMiddleware>();
app.UseMiddleware<RequestLoggingMiddleware>();
app.UseCors();
app.UseAuthentication();
app.UseMiddleware<AccountExistsMiddleware>();
app.UseAuthorization();
app.UseRateLimiter();

app.MapOpenApi("/openapi/{documentName}.json");
if (app.Environment.IsDevelopment() || config.GetValue("OpenApi:ExposeUi", false))
    app.MapScalarApiReference("/docs", o => o.WithTitle("TechRat API").WithTheme(ScalarTheme.Moon));

app.MapHealthChecks("/health/live", new() { Predicate = _ => false });
app.MapHealthChecks("/health/ready", new() { Predicate = c => c.Tags.Contains("ready") });
app.MapModules();
app.MapHub<NotificationsHub>("/hubs/notifications").RequireAuthorization();
app.MapGet("/", () => Results.Redirect("/docs")).ExcludeFromDescription();

app.Run();

public partial class Program;
