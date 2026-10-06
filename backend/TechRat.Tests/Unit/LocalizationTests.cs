using System.Text.RegularExpressions;
using TechRat.Application.Common;

namespace TechRat.Tests.Unit;

public class LocalizationTests
{
    [Fact]
    public void Every_text_exists_in_every_language_with_the_same_placeholders()
    {
        static string[] Placeholders(string s) => Regex.Matches(s, @"\{(\d+)(?::[^}]*)?\}").Select(m => m.Groups[1].Value).Distinct().Order().ToArray();

        Assert.Equal(Text.En.Keys.Order(), Text.PtBr.Keys.Order());
        Assert.All(Text.En, kv => Assert.Equal(Placeholders(kv.Value), Placeholders(Text.PtBr[kv.Key])));
    }

    [Fact]
    public void Formats_in_the_requested_locale_and_falls_back_to_the_key()
    {
        Assert.Equal("Achievement unlocked: Streak", Text.GetFor(AppLocales.English, Text.Keys.AchievementUnlockedTitle, "Streak"));
        Assert.Equal("Conquista desbloqueada: Sequência", Text.GetFor(AppLocales.PortugueseBrazil, Text.Keys.AchievementUnlockedTitle, "Sequência"));
        Assert.Equal("Sua precisão aqui é de 67%", Text.GetFor(AppLocales.PortugueseBrazil, Text.Keys.RecWeakness, 66.6));
        Assert.Equal("unknown.key", Text.GetFor(AppLocales.PortugueseBrazil, "unknown.key"));
    }

    [Fact]
    public void Missing_translations_fall_back_to_the_base_text()
    {
        var id = Guid.NewGuid();
        var tr = new ContentTranslations(new Dictionary<string, string> { [ContentTranslations.Key("topic", id, "name")] = "Estruturas de Dados" });
        Assert.Equal("Estruturas de Dados", tr.TopicName(id, "Data Structures"));
        Assert.Equal("Arrays", tr.SubtopicName(id, "Arrays"));
        Assert.Equal("Base", ContentTranslations.None.RoadmapName(id, "Base"));
    }
}
