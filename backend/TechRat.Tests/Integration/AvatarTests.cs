using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Http.Metadata;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TechRat.Application.Users;

namespace TechRat.Tests.Integration;

/// <summary>
/// Profile photos: clients crop and compress the image, the API stores it (PostgreSQL, one row per user), points the
/// user's avatar URL at a versioned public endpoint and replaces or removes it.
/// </summary>
[Collection(ApiCollection.Name)]
public class AvatarTests(TechRatFactory api)
{
    private static readonly byte[] Png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 1, 2, 3, 4];
    private static readonly byte[] Jpeg = [0xFF, 0xD8, 0xFF, 0xE0, 0, 16, 0x4A, 0x46, 0x49, 0x46, 0, 1, 5, 6, 7, 8];
    private static readonly byte[] Webp = [.. "RIFF"u8, 20, 0, 0, 0, .. "WEBPVP8 "u8, 1, 2, 3, 4];

    private static MultipartFormDataContent Form(byte[] bytes, string contentType = "image/webp", string name = "avatar.webp")
    {
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        return new MultipartFormDataContent { { file, "file", name } };
    }

    private static async Task<UserSummaryDto> UploadAsync(HttpClient client, byte[] bytes, string contentType = "image/webp")
    {
        var res = await client.PutAsync("/api/v1/users/me/avatar", Form(bytes, contentType));
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        return (await res.Content.ReadFromJsonAsync<UserSummaryDto>(TechRatFactory.Json))!;
    }

    [Fact]
    public async Task Uploading_a_photo_points_the_avatar_at_a_public_versioned_url_that_serves_the_image()
    {
        var (client, _) = await api.CreateUserAsync("av");
        var me = await UploadAsync(client, Webp);

        Assert.StartsWith($"/api/v1/users/{me.Id}/avatar?v=", me.AvatarUrl);
        var fresh = await client.GetFromJsonAsync<UserSummaryDto>("/api/v1/users/me", TechRatFactory.Json);
        Assert.Equal(me.AvatarUrl, fresh!.AvatarUrl);

        var image = await api.CreateClient().GetAsync(me.AvatarUrl);   // anonymous: avatars appear on leaderboards
        Assert.Equal(HttpStatusCode.OK, image.StatusCode);
        Assert.Equal("image/webp", image.Content.Headers.ContentType!.MediaType);
        Assert.Equal(Webp, await image.Content.ReadAsByteArrayAsync());
        Assert.True(image.Headers.CacheControl!.Public);
        Assert.Contains("immutable", image.Headers.CacheControl.ToString());
    }

    [Fact]
    public async Task A_new_photo_replaces_the_previous_one_under_a_new_url()
    {
        var (client, _) = await api.CreateUserAsync("av");
        var first = await UploadAsync(client, Png, "image/png");
        await Task.Delay(5);
        var second = await UploadAsync(client, Jpeg, "image/jpeg");

        Assert.NotEqual(first.AvatarUrl, second.AvatarUrl);
        var image = await api.CreateClient().GetAsync(second.AvatarUrl);
        Assert.Equal("image/jpeg", image.Content.Headers.ContentType!.MediaType);
        Assert.Equal(Jpeg, await image.Content.ReadAsByteArrayAsync());
        Assert.Equal(1, await api.WithDbAsync(db => db.UserAvatars.CountAsync(a => a.UserId == second.Id)));
    }

    [Fact]
    public async Task The_stored_type_comes_from_the_file_content_not_the_declared_type()
    {
        var (client, _) = await api.CreateUserAsync("av");
        var me = await UploadAsync(client, Png, "image/webp");
        var image = await api.CreateClient().GetAsync(me.AvatarUrl);
        Assert.Equal("image/png", image.Content.Headers.ContentType!.MediaType);
    }

    [Fact]
    public async Task Files_that_are_not_jpg_png_or_webp_are_rejected()
    {
        var (client, _) = await api.CreateUserAsync("av");
        var gif = "GIF89a"u8.ToArray().Concat(new byte[20]).ToArray();
        var res = await client.PutAsync("/api/v1/users/me/avatar", Form(gif, "image/png", "fake.png"));
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Contains("file", await res.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Images_over_the_size_limit_are_rejected()
    {
        var (client, _) = await api.CreateUserAsync("av");
        var big = Webp.Concat(new byte[AvatarService.MaxBytes]).ToArray();
        var res = await client.PutAsync("/api/v1/users/me/avatar", Form(big));
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public void The_upload_endpoint_caps_the_request_body_so_huge_bodies_are_never_read()
    {
        // Kestrel enforces the cap (413) from this metadata; TestServer does not, so the metadata itself is checked.
        var upload = api.Services.GetRequiredService<EndpointDataSource>().Endpoints.OfType<RouteEndpoint>()
            .Single(e => e.RoutePattern.RawText == "/api/v1/users/me/avatar" && e.Metadata.GetMetadata<HttpMethodMetadata>()!.HttpMethods.Contains("PUT"));
        Assert.Equal(2 * AvatarService.MaxBytes, upload.Metadata.GetMetadata<IRequestSizeLimitMetadata>()!.MaxRequestBodySize);
    }

    [Fact]
    public async Task Uploading_requires_a_signed_in_user()
    {
        var res = await api.CreateClient().PutAsync("/api/v1/users/me/avatar", Form(Webp));
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Removing_the_photo_goes_back_to_the_default_avatar()
    {
        var (client, _) = await api.CreateUserAsync("av");
        var me = await UploadAsync(client, Webp);

        var res = await client.DeleteAsync("/api/v1/users/me/avatar");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var after = await res.Content.ReadFromJsonAsync<UserSummaryDto>(TechRatFactory.Json);
        Assert.Null(after!.AvatarUrl);
        Assert.Equal(HttpStatusCode.NotFound, (await api.CreateClient().GetAsync(me.AvatarUrl)).StatusCode);
        Assert.Equal(0, await api.WithDbAsync(db => db.UserAvatars.CountAsync(a => a.UserId == me.Id)));
    }

    [Fact]
    public async Task Setting_an_external_avatar_url_deletes_the_uploaded_photo()
    {
        var (client, _) = await api.CreateUserAsync("av");
        var me = await UploadAsync(client, Webp);

        var res = await client.PatchAsJsonAsync("/api/v1/users/me", new { avatarUrl = "https://example.com/me.png" });
        res.EnsureSuccessStatusCode();
        Assert.Equal(0, await api.WithDbAsync(db => db.UserAvatars.CountAsync(a => a.UserId == me.Id)));
    }
}
