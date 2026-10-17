using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.DependencyInjection;
using TechRat.Application.Common;

namespace TechRat.Tests.Integration;

[Collection(ApiCollection.Name)]
public class CachingTests(TechRatFactory api)
{
    [Fact]
    public async Task The_hot_catalog_entries_are_really_stored_in_the_shared_cache()
    {
        // HybridCache silently skips a value over its payload limit: a catalog that outgrew it would go to the database on
        // every request without anyone noticing (ADR-0034).
        var (client, _) = await api.CreateUserAsync();
        client.DefaultRequestHeaders.AcceptLanguage.ParseAdd("pt-BR");
        (await client.GetAsync("/api/v1/topics")).EnsureSuccessStatusCode();
        (await client.GetAsync("/api/v1/roadmaps")).EnsureSuccessStatusCode();

        var shared = api.Services.GetRequiredService<IDistributedCache>();
        foreach (var key in new[] { CacheKeys.Topics, CacheKeys.Roadmaps, CacheKeys.Translations("pt-BR") })
            Assert.True(await shared.GetAsync(key) is { Length: > 0 }, $"{key} is not in the shared cache");
    }
}
