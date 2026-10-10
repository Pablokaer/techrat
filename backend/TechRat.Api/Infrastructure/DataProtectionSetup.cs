using System.Security.Cryptography.X509Certificates;

namespace TechRat.Api.Infrastructure;

/// <summary>
/// The ASP.NET Core Data Protection key ring signs and encrypts login cookies and bearer tokens, and is stored in
/// PostgreSQL so every instance and restart shares it (ADR-0008). Left as plain XML there, anyone who can read the table
/// (a leaked backup, a SQL injection) could forge a session for any account, administrators included. A certificate that
/// is kept outside the database encrypts the keys at rest (ADR-0029).
/// </summary>
public static class DataProtectionSetup
{
    public const string Section = "DataProtection";

    /// <summary>
    /// Reads the key-encryption certificate from <c>DataProtection:CertificateBase64</c> (an environment variable) or
    /// <c>DataProtection:CertificatePath</c> (a mounted file), unlocked by <c>DataProtection:CertificatePassword</c>.
    /// Returns null when none is configured. A configured but unreadable certificate throws, so the app refuses to start
    /// instead of silently running with unprotected keys.
    /// </summary>
    public static X509Certificate2? LoadKeyEncryptionCertificate(IConfiguration config)
    {
        var base64 = config[$"{Section}:CertificateBase64"];
        var path = config[$"{Section}:CertificatePath"];
        var password = config[$"{Section}:CertificatePassword"];
        if (string.IsNullOrWhiteSpace(base64) && string.IsNullOrWhiteSpace(path)) return null;

        try
        {
            var bytes = !string.IsNullOrWhiteSpace(base64) ? Convert.FromBase64String(base64.Trim()) : File.ReadAllBytes(path!);
            return X509CertificateLoader.LoadPkcs12(bytes, string.IsNullOrEmpty(password) ? null : password, X509KeyStorageFlags.EphemeralKeySet);
        }
        catch (Exception ex) when (ex is FormatException or IOException or UnauthorizedAccessException or System.Security.Cryptography.CryptographicException)
        {
            // The reason is enough to fix the setting; the password and the certificate bytes are never part of the message.
            throw new InvalidOperationException(
                $"{Section}: the key-encryption certificate could not be loaded ({ex.GetType().Name}). " +
                $"Check {Section}:CertificateBase64 or {Section}:CertificatePath and {Section}:CertificatePassword.", ex);
        }
    }
}
