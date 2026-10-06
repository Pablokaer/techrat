using Microsoft.AspNetCore.Identity;

namespace TechRat.Application.Identity;

/// <summary>Credential store record (ASP.NET Core Identity). Shares its Id with the learner profile <c>User</c>.</summary>
public sealed class ApplicationUser : IdentityUser<Guid>
{
}

public static class Roles
{
    public const string Admin = "Admin";
}

public static class Policies
{
    public const string Admin = "AdminOnly";
}
