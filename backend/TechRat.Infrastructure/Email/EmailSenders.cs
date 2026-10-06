using System.Net;
using System.Text.RegularExpressions;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;
using TechRat.Application.Common;
using TechRat.Application.Identity;

namespace TechRat.Infrastructure.Email;

/// <summary>SMTP settings (section "Smtp"). Works with any provider that offers SMTP (Resend, Amazon SES, Brevo, Mailpit locally).</summary>
public sealed class SmtpOptions
{
    public const string Section = "Smtp";
    public string? Host { get; set; }
    public int Port { get; set; } = 587;
    /// <summary>"StartTls" (port 587), "SslOnConnect" (port 465) or "None" (local Mailpit only). When empty, <see cref="UseStartTls"/> decides.</summary>
    public string? Security { get; set; }
    /// <summary>Legacy flag: true = STARTTLS required, false = no TLS. Prefer <see cref="Security"/>.</summary>
    public bool UseStartTls { get; set; } = true;
    public string? Username { get; set; }
    public string? Password { get; set; }
    public string From { get; set; } = "TechRat <no-reply@techrat.local>";
    public string? ReplyTo { get; set; }
    public int TimeoutSeconds { get; set; } = 15;
    public bool IsConfigured => !string.IsNullOrWhiteSpace(Host);

    /// <summary>
    /// TLS mode for MailKit. Never "when available": a server (or an attacker) that doesn't offer STARTTLS must make the
    /// send fail instead of silently sending the credentials and the message in plain text.
    /// </summary>
    public SecureSocketOptions SocketOptions() => Security?.Trim().ToLowerInvariant() switch
    {
        null or "" => UseStartTls ? SecureSocketOptions.StartTls : SecureSocketOptions.None,
        "starttls" => SecureSocketOptions.StartTls,
        "sslonconnect" or "ssl" or "tls" => SecureSocketOptions.SslOnConnect,
        "none" => SecureSocketOptions.None,
        _ => throw new InvalidOperationException($"Unknown Smtp:Security '{Security}'. Use StartTls, SslOnConnect or None."),
    };
}

/// <summary>Builds the plain-text alternative of the HTML emails (better deliverability, readable in any client).</summary>
public static partial class EmailContent
{
    public static string ToPlainText(string html)
    {
        var text = AnchorRx().Replace(html, m => $"{m.Groups["text"].Value}: {m.Groups["href"].Value}");
        text = BlockEndRx().Replace(text, "\n\n");
        text = BreakRx().Replace(text, "\n");
        text = TagRx().Replace(text, "");
        text = WebUtility.HtmlDecode(text);
        return MultiBlankRx().Replace(text, "\n\n").Trim();
    }

    [GeneratedRegex("<a\\s[^>]*href=\"(?<href>[^\"]*)\"[^>]*>(?<text>.*?)</a>", RegexOptions.IgnoreCase | RegexOptions.Singleline)]
    private static partial Regex AnchorRx();
    [GeneratedRegex("</(p|pre|div|h[1-6]|li)>", RegexOptions.IgnoreCase)]
    private static partial Regex BlockEndRx();
    [GeneratedRegex("<br\\s*/?>", RegexOptions.IgnoreCase)]
    private static partial Regex BreakRx();
    [GeneratedRegex("<[^>]+>")]
    private static partial Regex TagRx();
    [GeneratedRegex("\\n{3,}")]
    private static partial Regex MultiBlankRx();
}

/// <summary>
/// Sends Identity emails (and the admin SMTP test) over SMTP. Without SMTP configured it logs that nothing was sent —
/// never the token itself. Delivery failures surface as <see cref="EmailDeliveryException"/>.
/// </summary>
public sealed class IdentityEmailSender(IOptions<SmtpOptions> options, IConfiguration config, TimeProvider clock, ILogger<IdentityEmailSender> logger)
    : IEmailSender<ApplicationUser>, ITestEmailSender, IAccountEmailSender
{
    private readonly SmtpOptions _o = options.Value;

    public bool IsConfigured => _o.IsConfigured;

    public Task SendConfirmationLinkAsync(ApplicationUser user, string email, string confirmationLink) =>
        SendAsync(email, Text.Get(Text.Keys.EmailConfirmSubject), Text.Get(Text.Keys.EmailConfirmBody, confirmationLink), CancellationToken.None);

    public Task SendPasswordResetLinkAsync(ApplicationUser user, string email, string resetLink) =>
        SendAsync(email, Text.Get(Text.Keys.EmailResetSubject), Text.Get(Text.Keys.EmailResetBody, resetLink), CancellationToken.None);

    public Task SendPasswordResetCodeAsync(ApplicationUser user, string email, string resetCode) =>
        SendAsync(email, Text.Get(Text.Keys.EmailResetCodeSubject), Text.Get(Text.Keys.EmailResetCodeBody, WebUtility.HtmlEncode(resetCode)), CancellationToken.None);

    public Task SendPasswordChangedAsync(string email, CancellationToken ct)
    {
        var resetLink = $"{(config["App:PublicWebUrl"] ?? "http://localhost:3000").TrimEnd('/')}/forgot-password";
        var when = clock.GetUtcNow().ToString("yyyy-MM-dd HH:mm", System.Globalization.CultureInfo.InvariantCulture);
        return SendAsync(email, Text.Get(Text.Keys.EmailPasswordChangedSubject), Text.Get(Text.Keys.EmailPasswordChangedBody, when, resetLink), ct);
    }

    public Task SendTestAsync(string to, CancellationToken ct) =>
        SendAsync(to, Text.Get(Text.Keys.EmailTestSubject), Text.Get(Text.Keys.EmailTestBody, _o.Host, _o.Port, _o.SocketOptions()), ct);

    private async Task SendAsync(string to, string subject, string html, CancellationToken ct)
    {
        if (!_o.IsConfigured)
        {
            logger.LogWarning("SMTP is not configured; email '{Subject}' was not sent", subject);
            return;
        }
        var message = new MimeMessage();
        message.From.Add(MailboxAddress.Parse(_o.From));
        message.To.Add(MailboxAddress.Parse(to));
        if (!string.IsNullOrWhiteSpace(_o.ReplyTo)) message.ReplyTo.Add(MailboxAddress.Parse(_o.ReplyTo));
        message.Subject = subject;
        message.Body = new BodyBuilder { HtmlBody = html, TextBody = EmailContent.ToPlainText(html) }.ToMessageBody();

        try
        {
            using var client = new SmtpClient { Timeout = _o.TimeoutSeconds * 1000 };
            await client.ConnectAsync(_o.Host!, _o.Port, _o.SocketOptions(), ct);
            if (!string.IsNullOrEmpty(_o.Username)) await client.AuthenticateAsync(_o.Username, _o.Password ?? "", ct);
            await client.SendAsync(message, ct);
            await client.DisconnectAsync(true, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException || !ct.IsCancellationRequested)
        {
            // Log the SMTP error, never the message body (it can contain reset links or codes).
            logger.LogError(ex, "Email '{Subject}' could not be sent through {SmtpHost}:{SmtpPort}", subject, _o.Host, _o.Port);
            throw new EmailDeliveryException(Text.Get(Text.Keys.EmailDeliveryFailed, ex.Message));
        }
        logger.LogInformation("Email '{Subject}' sent", subject);
    }
}
