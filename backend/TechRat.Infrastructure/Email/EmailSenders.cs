using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;
using TechRat.Application.Common;
using TechRat.Application.Identity;

namespace TechRat.Infrastructure.Email;

public sealed class SmtpOptions
{
    public const string Section = "Smtp";
    public string? Host { get; set; }
    public int Port { get; set; } = 587;
    public bool UseStartTls { get; set; } = true;
    public string? Username { get; set; }
    public string? Password { get; set; }
    public string From { get; set; } = "TechRat <no-reply@techrat.local>";
    public bool IsConfigured => !string.IsNullOrWhiteSpace(Host);
}

/// <summary>Sends Identity emails over SMTP (Mailpit in local docker). Without SMTP configured it logs that nothing was sent — never the token itself.</summary>
public sealed class IdentityEmailSender(IOptions<SmtpOptions> options, ILogger<IdentityEmailSender> logger) : IEmailSender<ApplicationUser>
{
    private readonly SmtpOptions _o = options.Value;

    public Task SendConfirmationLinkAsync(ApplicationUser user, string email, string confirmationLink) =>
        SendAsync(email, Text.Get(Text.Keys.EmailConfirmSubject), Text.Get(Text.Keys.EmailConfirmBody, confirmationLink));

    public Task SendPasswordResetLinkAsync(ApplicationUser user, string email, string resetLink) =>
        SendAsync(email, Text.Get(Text.Keys.EmailResetSubject), Text.Get(Text.Keys.EmailResetBody, resetLink));

    public Task SendPasswordResetCodeAsync(ApplicationUser user, string email, string resetCode) =>
        SendAsync(email, Text.Get(Text.Keys.EmailResetCodeSubject), Text.Get(Text.Keys.EmailResetCodeBody, System.Net.WebUtility.HtmlEncode(resetCode)));

    private async Task SendAsync(string to, string subject, string html)
    {
        if (!_o.IsConfigured)
        {
            logger.LogWarning("SMTP is not configured; email '{Subject}' was not sent", subject);
            return;
        }
        var message = new MimeMessage();
        message.From.Add(MailboxAddress.Parse(_o.From));
        message.To.Add(MailboxAddress.Parse(to));
        message.Subject = subject;
        message.Body = new BodyBuilder { HtmlBody = html }.ToMessageBody();

        using var client = new SmtpClient();
        await client.ConnectAsync(_o.Host!, _o.Port, _o.UseStartTls ? SecureSocketOptions.StartTlsWhenAvailable : SecureSocketOptions.None);
        if (!string.IsNullOrEmpty(_o.Username)) await client.AuthenticateAsync(_o.Username, _o.Password ?? "");
        await client.SendAsync(message);
        await client.DisconnectAsync(true);
        logger.LogInformation("Email '{Subject}' sent", subject);
    }
}
