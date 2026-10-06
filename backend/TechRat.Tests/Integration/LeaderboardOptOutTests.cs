using System.Net.Http.Json;
using TechRat.Application.Leaderboards;
using TechRat.Application.Users;

namespace TechRat.Tests.Integration;

/// <summary>Learners can opt out of every leaderboard from Settings; their progress and XP stay untouched.</summary>
[Collection(ApiCollection.Name)]
public class LeaderboardOptOutTests(TechRatFactory api)
{
    private static async Task<UserSummaryDto> SetAsync(HttpClient client, bool show)
    {
        var res = await client.PatchAsJsonAsync("/api/v1/users/me", new { showOnLeaderboard = show });
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<UserSummaryDto>(TechRatFactory.Json))!;
    }

    private async Task<(HttpClient Client, string Username)> UserWithXpAsync()
    {
        var (client, username) = await api.CreateUserAsync("lb");
        var s = await Practice.StartAsync(client, new { mode = "Practice", topicSlug = "kubernetes", difficulty = "Expert", count = 2 });
        foreach (var q in s.Questions) await Practice.AnswerAsync(api, client, s, q, true);
        return (client, username);
    }

    private static async Task<LeaderboardDto> BoardAsync(HttpClient client, string scope) =>
        (await client.GetFromJsonAsync<LeaderboardDto>($"/api/v1/leaderboards/{scope}?topic=kubernetes&pageSize=100", TechRatFactory.Json))!;

    [Fact]
    public async Task Learners_take_part_by_default()
    {
        var (client, _) = await api.CreateUserAsync("lb");
        Assert.True((await client.GetFromJsonAsync<UserSummaryDto>("/api/v1/users/me", TechRatFactory.Json))!.ShowOnLeaderboard);
    }

    [Theory]
    [InlineData("Global")]
    [InlineData("Weekly")]
    [InlineData("Monthly")]
    [InlineData("Topic")]
    public async Task An_opted_out_learner_disappears_from_every_leaderboard_at_once(string scope)
    {
        var (me, username) = await UserWithXpAsync();
        var (other, _) = await UserWithXpAsync();
        await BoardAsync(other, scope);   // warms the 30 s page cache, which must not keep showing the learner

        Assert.False((await SetAsync(me, false)).ShowOnLeaderboard);

        var board = await BoardAsync(other, scope);
        Assert.DoesNotContain(board.Entries, e => e.Username == username);
        Assert.Null((await BoardAsync(me, scope)).Me);
    }

    [Fact]
    public async Task Opting_back_in_returns_the_learner_with_the_same_xp()
    {
        var (me, username) = await UserWithXpAsync();
        var before = (await BoardAsync(me, "Global")).Me!;
        await SetAsync(me, false);
        await SetAsync(me, true);

        var after = (await BoardAsync(me, "Global")).Me!;
        Assert.Equal(username, after.Username);
        Assert.Equal(before.Xp, after.Xp);
    }

    [Fact]
    public async Task Hidden_learners_do_not_take_a_rank_from_anyone()
    {
        var (me, _) = await UserWithXpAsync();
        var (other, _) = await UserWithXpAsync();
        var rankBefore = (await other.GetFromJsonAsync<UserSummaryDto>("/api/v1/users/me", TechRatFactory.Json))!.GlobalRank;

        await SetAsync(me, false);

        var rankAfter = (await other.GetFromJsonAsync<UserSummaryDto>("/api/v1/users/me", TechRatFactory.Json))!.GlobalRank;
        Assert.True(rankAfter <= rankBefore);
    }

    [Fact]
    public async Task Saving_the_profile_without_the_setting_leaves_it_unchanged()
    {
        var (me, _) = await api.CreateUserAsync("lb");
        await SetAsync(me, false);
        var res = await me.PatchAsJsonAsync("/api/v1/users/me", new { displayName = "Renamed Learner" });
        res.EnsureSuccessStatusCode();
        Assert.False((await res.Content.ReadFromJsonAsync<UserSummaryDto>(TechRatFactory.Json))!.ShowOnLeaderboard);
    }
}
