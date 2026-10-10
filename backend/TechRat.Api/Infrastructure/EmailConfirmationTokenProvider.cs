using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TechRat.Application.Identity;

namespace TechRat.Api.Infrastructure;

/// <summary>Lifetime of the email confirmation link; separate from the one-hour password reset link (<see cref="AuthPolicy"/>).</summary>
public sealed class EmailConfirmationTokenProviderOptions : DataProtectionTokenProviderOptions
{
}

/// <summary>
/// Identity uses one token provider for every emailed link, so a one-hour limit for password resets would also apply to
/// the link that confirms a new account. This provider is registered under its own name just for email confirmation.
/// </summary>
public sealed class EmailConfirmationTokenProvider(
    IDataProtectionProvider dataProtection, IOptions<EmailConfirmationTokenProviderOptions> options,
    ILogger<DataProtectorTokenProvider<ApplicationUser>> logger)
    : DataProtectorTokenProvider<ApplicationUser>(dataProtection, options, logger)
{
    public const string ProviderName = "EmailConfirmation";
}
