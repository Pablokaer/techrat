using MailKit.Security;
using TechRat.Infrastructure.Email;

namespace TechRat.Tests.Unit;

public class EmailTests
{
    [Theory]
    [InlineData("StartTls", true, SecureSocketOptions.StartTls)]
    [InlineData("SslOnConnect", false, SecureSocketOptions.SslOnConnect)]
    [InlineData("None", true, SecureSocketOptions.None)]
    [InlineData("starttls", false, SecureSocketOptions.StartTls)]
    // Without Security the legacy flag decides, and STARTTLS is now required (never silently downgraded to plain text).
    [InlineData(null, true, SecureSocketOptions.StartTls)]
    [InlineData(null, false, SecureSocketOptions.None)]
    public void Security_mode_never_falls_back_to_plain_text(string? security, bool useStartTls, SecureSocketOptions expected)
    {
        var options = new SmtpOptions { Host = "smtp.example.com", Security = security, UseStartTls = useStartTls };
        Assert.Equal(expected, options.SocketOptions());
    }

    [Fact]
    public void Unknown_security_mode_is_a_configuration_error()
    {
        var options = new SmtpOptions { Host = "smtp.example.com", Security = "Maybe" };
        Assert.Throws<InvalidOperationException>(() => options.SocketOptions());
    }

    [Fact]
    public void Plain_text_version_keeps_paragraphs_and_link_targets()
    {
        var html = "<p>Someone requested a password reset.</p><p><a href=\"https://techrat.dev/reset?code=a&amp;b\">Choose a new password</a></p><pre>12345</pre>";
        Assert.Equal("Someone requested a password reset.\n\nChoose a new password: https://techrat.dev/reset?code=a&b\n\n12345",
            EmailContent.ToPlainText(html));
    }
}
