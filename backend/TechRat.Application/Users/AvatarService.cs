using Microsoft.EntityFrameworkCore;
using TechRat.Application.Common;
using TechRat.Domain.Users;

namespace TechRat.Application.Users;

/// <summary>A stored profile photo, as served by the public avatar endpoint.</summary>
public sealed record AvatarImage(byte[] Content, string ContentType, DateTimeOffset UpdatedAt);

/// <summary>
/// Profile photos. Clients crop the picture to a square and compress it (512×512) before uploading, so the API only
/// checks the file signature and size, stores it in PostgreSQL (one row per user, replaced on every upload) and points
/// <see cref="User.AvatarUrl"/> at a versioned public URL that browsers can cache forever.
/// </summary>
public sealed class AvatarService(IAppDbContext db, ProfileService profiles, TimeProvider clock)
{
    /// <summary>Largest accepted upload. A 512×512 WEBP/JPEG is ~20–80 KB; even an uncompressed PNG fits.</summary>
    public const int MaxBytes = 1024 * 1024;

    /// <summary>Relative URL of a user's stored photo; the version changes with every upload.</summary>
    public static string UrlFor(Guid userId, DateTimeOffset version) => $"/api/v1/users/{userId}/avatar?v={version.ToUnixTimeMilliseconds()}";

    public async Task<UserSummaryDto> SetAsync(Guid userId, bool isAdmin, Stream? content, long length, CancellationToken ct)
    {
        if (content is null || length == 0) throw Invalid(Text.Keys.AvatarMissing);
        if (length > MaxBytes) throw Invalid(Text.Keys.AvatarTooLarge);
        using var buffer = new MemoryStream((int)length);
        await content.CopyToAsync(buffer, ct);
        var bytes = buffer.ToArray();
        var contentType = DetectImageType(bytes) ?? throw Invalid(Text.Keys.AvatarFormat);

        var now = clock.GetUtcNow();
        var avatar = await db.UserAvatars.FirstOrDefaultAsync(a => a.UserId == userId, ct);
        if (avatar is null) db.UserAvatars.Add(new UserAvatar { UserId = userId, Content = bytes, ContentType = contentType, UpdatedAt = now });
        else (avatar.Content, avatar.ContentType, avatar.UpdatedAt) = (bytes, contentType, now);
        var user = await db.UserProfiles.FirstAsync(u => u.Id == userId, ct);
        user.AvatarUrl = UrlFor(userId, now);
        await db.SaveChangesAsync(ct);
        return await profiles.GetSummaryAsync(userId, isAdmin, ct);
    }

    /// <summary>Deletes the stored photo (if any) and goes back to the default avatar.</summary>
    public async Task<UserSummaryDto> RemoveAsync(Guid userId, bool isAdmin, CancellationToken ct)
    {
        await db.UserAvatars.Where(a => a.UserId == userId).ExecuteDeleteAsync(ct);
        var user = await db.UserProfiles.FirstAsync(u => u.Id == userId, ct);
        user.AvatarUrl = null;
        await db.SaveChangesAsync(ct);
        return await profiles.GetSummaryAsync(userId, isAdmin, ct);
    }

    public Task<AvatarImage?> GetAsync(Guid userId, CancellationToken ct) =>
        db.UserAvatars.AsNoTracking().Where(a => a.UserId == userId)
            .Select(a => new AvatarImage(a.Content, a.ContentType, a.UpdatedAt)).FirstOrDefaultAsync(ct);

    /// <summary>JPEG, PNG or WEBP from the file signature; null for anything else (the declared type is never trusted).</summary>
    public static string? DetectImageType(ReadOnlySpan<byte> b)
    {
        if (b.Length >= 3 && b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF) return "image/jpeg";
        if (b.Length >= 8 && b[..8].SequenceEqual((ReadOnlySpan<byte>)[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) return "image/png";
        if (b.Length >= 12 && b[..4].SequenceEqual("RIFF"u8) && b[8..12].SequenceEqual("WEBP"u8)) return "image/webp";
        return null;
    }

    private static RequestValidationException Invalid(string key) => new(new Dictionary<string, string[]> { ["file"] = [Text.Get(key)] });
}
