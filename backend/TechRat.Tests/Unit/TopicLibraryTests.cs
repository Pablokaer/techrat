using TechRat.Application.Resources;

namespace TechRat.Tests.Unit;

/// <summary>The pure rules that build a topic's study library from module reading lists and question references.</summary>
public class TopicLibraryTests
{
    private static StudySourceDto Src(string url, string title = "t") => new(title, url, "article", "en", null);
    private static StudyTopicDto Topic(string key, params StudySourceDto[] sources) => new(key, key, sources);

    [Fact]
    public void A_link_already_listed_by_an_earlier_module_is_not_repeated_later()
    {
        var shared = Src("https://example.com/shared");
        var library = TopicLibrary.MergeModules(
        [
            ("a", "Module A", new ModuleResourcesDto([Topic("x", shared, Src("https://example.com/a"))])),
            ("b", "Module B", new ModuleResourcesDto([Topic("y", shared, Src("https://example.com/b"))])),
        ]);

        Assert.Equal(["https://example.com/shared", "https://example.com/a"], library[0].Topics[0].Sources.Select(s => s.Url));
        Assert.Equal(["https://example.com/b"], library[1].Topics[0].Sources.Select(s => s.Url));
    }

    [Fact]
    public void A_link_repeated_inside_one_module_is_listed_once()
    {
        var library = TopicLibrary.MergeModules(
        [
            ("a", "Module A", new ModuleResourcesDto([Topic("x", Src("https://example.com/1")), Topic("y", Src("https://example.com/1"), Src("https://example.com/2"))])),
        ]);

        Assert.Equal(["x", "y"], library[0].Topics.Select(t => t.Key));
        Assert.DoesNotContain(library[0].Topics[1].Sources, s => s.Url == "https://example.com/1");
        Assert.Equal(["https://example.com/2"], library[0].Topics[1].Sources.Select(s => s.Url));
    }

    [Fact]
    public void Topics_and_modules_left_without_sources_are_dropped()
    {
        var dup = Src("https://example.com/dup");
        var library = TopicLibrary.MergeModules(
        [
            ("a", "Module A", new ModuleResourcesDto([Topic("x", dup)])),
            ("b", "Module B", new ModuleResourcesDto([Topic("y", dup)])),
            ("c", "Module C", new ModuleResourcesDto([])),
        ]);

        Assert.Equal(["a"], library.Select(m => m.Slug));
    }

    [Fact]
    public void The_module_order_given_is_kept_and_the_module_name_travels_with_its_topics()
    {
        var library = TopicLibrary.MergeModules(
        [
            ("second", "Second", new ModuleResourcesDto([Topic("x", Src("https://example.com/2"))])),
            ("first", "First", new ModuleResourcesDto([Topic("y", Src("https://example.com/1"))])),
        ]);

        Assert.Equal([("second", "Second"), ("first", "First")], library.Select(m => (m.Slug, m.Name)));
    }

    [Fact]
    public void Questions_citing_the_same_page_are_counted_together_with_the_first_title_as_example()
    {
        var cited = TopicLibrary.Cite(
        [
            new("https://docs.example.com/a", "Zebra question"),
            new("https://docs.example.com/a", "Alpha question"),
            new("https://docs.example.com/b", "Only one"),
        ]);

        var a = Assert.Single(cited, c => c.Url == "https://docs.example.com/a");
        Assert.Equal(2, a.Questions);
        Assert.Equal("Alpha question", a.ExampleQuestion);
    }

    [Fact]
    public void The_most_cited_pages_come_first_then_by_address()
    {
        var cited = TopicLibrary.Cite(
        [
            new("https://b.example.com/x", "q1"),
            new("https://a.example.com/x", "q2"),
            new("https://c.example.com/x", "q3"),
            new("https://c.example.com/x", "q4"),
        ]);

        Assert.Equal(["https://c.example.com/x", "https://a.example.com/x", "https://b.example.com/x"], cited.Select(c => c.Url));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("http://insecure.example.com/page")]
    [InlineData("javascript:alert(1)")]
    [InlineData("not a url")]
    public void Blank_or_non_https_references_are_ignored(string url)
    {
        Assert.Empty(TopicLibrary.Cite([new(url, "q")]));
    }

    [Theory]
    [InlineData("https://www.postgresql.org/docs/current/btree.html", "postgresql.org")]
    [InlineData("https://learn.microsoft.com/en-us/azure/", "learn.microsoft.com")]
    [InlineData("https://xlinux.nist.gov/dads/HTML/trie.html", "xlinux.nist.gov")]
    public void The_host_shown_next_to_a_reference_drops_the_www_prefix(string url, string host)
    {
        Assert.Equal(host, TopicLibrary.HostOf(url));
    }

    [Fact]
    public void The_source_count_adds_curated_and_cited_links_without_counting_a_page_twice()
    {
        var library = TopicLibrary.MergeModules(
        [
            ("a", "Module A", new ModuleResourcesDto([Topic("x", Src("https://example.com/1"), Src("https://example.com/2"))])),
        ]);
        var cited = TopicLibrary.Cite([new("https://example.com/2", "q"), new("https://example.com/3", "q")]);

        Assert.Equal(3, TopicLibrary.CountDistinctLinks(library, [new CitedSubtopicDto("s", "S", cited)]));
    }
}
