using System.Reflection;
using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using TechRat.Application.Common;
using TechRat.Application.Identity;

namespace TechRat.Modules.Common;

/// <summary>
/// Caps the request body of one endpoint (Kestrel answers 413 beyond it). Minimal-API counterpart of MVC's
/// RequestSizeLimitAttribute, honoured through <see cref="Microsoft.AspNetCore.Http.Metadata.IRequestSizeLimitMetadata"/>.
/// </summary>
public sealed class RequestSizeLimit(long maxBytes) : Microsoft.AspNetCore.Http.Metadata.IRequestSizeLimitMetadata
{
    public long? MaxRequestBodySize => maxBytes;
}

/// <summary>Each module exposes its HTTP surface through one implementation of this interface.</summary>
public interface IEndpointModule
{
    void Map(RouteGroupBuilder api);
}

public static class ModuleRegistration
{
    public const string ApiPrefix = "/api/v1";

    public static IServiceCollection AddModules(this IServiceCollection services)
    {
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUser, HttpCurrentUser>();
        return services;
    }

    /// <summary>Discovers and maps every module under the versioned API prefix.</summary>
    public static RouteGroupBuilder MapModules(this IEndpointRouteBuilder app)
    {
        var api = app.MapGroup(ApiPrefix);
        foreach (var type in Assembly.GetExecutingAssembly().GetTypes()
                     .Where(t => t is { IsAbstract: false, IsInterface: false } && typeof(IEndpointModule).IsAssignableFrom(t))
                     .OrderBy(t => t.Name))
            ((IEndpointModule)Activator.CreateInstance(type)!).Map(api);
        return api;
    }
}

public sealed class HttpCurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    public Guid? UserId =>
        Guid.TryParse(accessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    public bool IsAdmin => accessor.HttpContext?.User.IsInRole(Roles.Admin) ?? false;
}
