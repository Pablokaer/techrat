using Microsoft.AspNetCore.Http.Features;

namespace TechRat.Api.Infrastructure;

/// <summary>
/// Keeps what is private out of browser and proxy caches (ADR-0030). Responses of the auth and account endpoints carry
/// tokens or change the account, so they are never stored, whatever an endpoint says. Anything else a signed-in person
/// reads is marked no-store unless the endpoint chose its own policy; public content for anonymous visitors is untouched.
/// </summary>
public sealed class NoStoreMiddleware(RequestDelegate next)
{
    public Task InvokeAsync(HttpContext ctx)
    {
        var strict = ctx.Request.Path.StartsWithSegments("/api/v1/auth") || ctx.Request.Path.StartsWithSegments("/api/v1/account");
        ctx.Response.OnStarting(() =>
        {
            var headers = ctx.Response.Headers;
            if (strict)
            {
                headers.CacheControl = "no-store";
                headers.Pragma = "no-cache";
            }
            else if (ctx.User.Identity?.IsAuthenticated == true && !headers.ContainsKey("Cache-Control"))
            {
                headers.CacheControl = "no-store";
            }
            return Task.CompletedTask;
        });
        return next(ctx);
    }
}

/// <summary>
/// Sign-in, sign-up, reset and account requests are a few hundred bytes of JSON, so they get a small body limit (8 KB)
/// instead of the server's 30 MB: a declared oversized body is refused at once and the server limit is lowered for
/// bodies of unknown size. Other endpoints (avatar upload) keep the server default.
/// </summary>
public sealed class SmallBodyMiddleware(RequestDelegate next)
{
    public const int MaxBytes = 8 * 1024;

    public Task InvokeAsync(HttpContext ctx)
    {
        var path = ctx.Request.Path;
        if (!path.StartsWithSegments("/api/v1/auth") && !path.StartsWithSegments("/api/v1/account")) return next(ctx);

        if (ctx.Request.ContentLength > MaxBytes)
        {
            ctx.Response.StatusCode = StatusCodes.Status413PayloadTooLarge;
            return Task.CompletedTask;
        }
        var feature = ctx.Features.Get<IHttpMaxRequestBodySizeFeature>();
        if (feature is { IsReadOnly: false }) feature.MaxRequestBodySize = MaxBytes;
        return next(ctx);
    }
}
