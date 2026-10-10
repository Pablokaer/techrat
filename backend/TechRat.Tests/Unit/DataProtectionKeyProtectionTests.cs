using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Configuration;
using TechRat.Api.Infrastructure;

namespace TechRat.Tests.Unit;

/// <summary>
/// The key ring that signs and encrypts login cookies and bearer tokens lives in PostgreSQL. Unprotected, whoever can read
/// the table (a leaked backup, a SQL injection) can forge a session for any account; encrypting it with a certificate
/// that is not stored next to the data closes that (ADR-0029).
/// </summary>
public class DataProtectionKeyProtectionTests : IDisposable
{
    private const string Password = "test-only-pfx-password";
    private readonly string _dir = Path.Combine(Path.GetTempPath(), "techrat-dp-" + Guid.NewGuid().ToString("N"));

    public void Dispose()
    {
        if (Directory.Exists(_dir)) Directory.Delete(_dir, recursive: true);
    }

    private static byte[] NewPfx()
    {
        using var rsa = RSA.Create(2048);
        var request = new CertificateRequest("CN=techrat-dataprotection-test", rsa, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        using var cert = request.CreateSelfSigned(DateTimeOffset.UtcNow.AddDays(-1), DateTimeOffset.UtcNow.AddDays(30));
        return cert.Export(X509ContentType.Pfx, Password);
    }

    private static IConfiguration Config(params (string Key, string? Value)[] values) =>
        new ConfigurationBuilder().AddInMemoryCollection(values.Select(v => new KeyValuePair<string, string?>(v.Key, v.Value))).Build();

    [Fact]
    public void Nothing_is_loaded_when_no_certificate_is_configured()
    {
        Assert.Null(DataProtectionSetup.LoadKeyEncryptionCertificate(Config()));
        Assert.Null(DataProtectionSetup.LoadKeyEncryptionCertificate(Config(("DataProtection:CertificateBase64", " "), ("DataProtection:CertificatePath", ""))));
    }

    [Fact]
    public void A_certificate_can_come_from_an_environment_variable_as_base64()
    {
        var pfx = NewPfx();

        using var cert = DataProtectionSetup.LoadKeyEncryptionCertificate(Config(
            ("DataProtection:CertificateBase64", Convert.ToBase64String(pfx)), ("DataProtection:CertificatePassword", Password)));

        Assert.NotNull(cert);
        Assert.True(cert!.HasPrivateKey);
        Assert.Equal("CN=techrat-dataprotection-test", cert.Subject);
    }

    [Fact]
    public void A_certificate_can_come_from_a_mounted_file()
    {
        Directory.CreateDirectory(_dir);
        var path = Path.Combine(_dir, "dp.pfx");
        File.WriteAllBytes(path, NewPfx());

        using var cert = DataProtectionSetup.LoadKeyEncryptionCertificate(Config(
            ("DataProtection:CertificatePath", path), ("DataProtection:CertificatePassword", Password)));

        Assert.True(cert!.HasPrivateKey);
    }

    [Fact]
    public void A_wrong_password_or_a_broken_value_stops_the_start_with_a_clear_message_instead_of_running_unprotected()
    {
        var pfx = Convert.ToBase64String(NewPfx());

        var wrongPassword = Assert.Throws<InvalidOperationException>(() => DataProtectionSetup.LoadKeyEncryptionCertificate(Config(
            ("DataProtection:CertificateBase64", pfx), ("DataProtection:CertificatePassword", "not-the-password"))));
        var notBase64 = Assert.Throws<InvalidOperationException>(() => DataProtectionSetup.LoadKeyEncryptionCertificate(Config(
            ("DataProtection:CertificateBase64", "%%% not base64 %%%"))));
        var missingFile = Assert.Throws<InvalidOperationException>(() => DataProtectionSetup.LoadKeyEncryptionCertificate(Config(
            ("DataProtection:CertificatePath", Path.Combine(_dir, "missing.pfx")))));

        Assert.All([wrongPassword, notBase64, missingFile], e => Assert.Contains("DataProtection", e.Message));
        Assert.DoesNotContain(Password, wrongPassword.Message);
    }

    [Fact]
    public void Without_a_certificate_the_key_is_plain_text_which_is_the_exposure_this_closes()
    {
        Directory.CreateDirectory(_dir);

        DataProtectionProvider.Create(new DirectoryInfo(_dir), b => b.SetApplicationName("control"))
            .CreateProtector("test").Protect("session");

        // The control proves the assertion below can fail: with no protector configured the master key is readable XML.
        var xml = string.Concat(Directory.GetFiles(_dir, "key-*.xml").Select(File.ReadAllText));
        Assert.Contains("<masterKey", xml);
    }

    [Fact]
    public void Keys_are_stored_encrypted_when_a_certificate_protects_the_key_ring_and_readable_by_the_same_certificate()
    {
        Directory.CreateDirectory(_dir);
        using var cert = DataProtectionSetup.LoadKeyEncryptionCertificate(Config(
            ("DataProtection:CertificateBase64", Convert.ToBase64String(NewPfx())), ("DataProtection:CertificatePassword", Password)))!;

        var protector = DataProtectionProvider.Create(new DirectoryInfo(_dir), b => b.ProtectKeysWithCertificate(cert)).CreateProtector("test");
        var sealed_ = protector.Protect("session");

        var xml = string.Concat(Directory.GetFiles(_dir, "key-*.xml").Select(File.ReadAllText));
        Assert.Contains("EncryptedXmlDecryptor", xml);
        Assert.DoesNotContain("<masterKey", xml);
        var again = DataProtectionProvider.Create(new DirectoryInfo(_dir), b => b.ProtectKeysWithCertificate(cert)).CreateProtector("test");
        Assert.Equal("session", again.Unprotect(sealed_));
    }
}
