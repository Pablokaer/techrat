using Microsoft.AspNetCore.Identity;
using TechRat.Application.Identity;

namespace TechRat.Modules.Identity;

/// <summary>The web sign-in cookie, cleared through Identity's SignInManager on behalf of <see cref="IAccountSessions"/>.</summary>
public sealed class IdentitySessionCookie(SignInManager<ApplicationUser> signIn) : ISessionCookie
{
    public Task SignOutAsync() => signIn.SignOutAsync();
}
