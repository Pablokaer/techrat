using System.Security.Cryptography;
using System.Text.RegularExpressions;

namespace TechRat.Application.Practice;

/// <summary>
/// Display order of a question's answer options (ADR-0019). Options are stored in authoring order; every practice
/// session shows them in its own random order, so learners learn the content instead of the position of the answer.
/// The order is a Fisher–Yates shuffle seeded from (session, question): the same session always shows the same order
/// (reloads, the review after finishing) and needs no storage, while another session gets a fresh order. Grading,
/// feedback and history use option ids, never positions.
/// </summary>
public static partial class OptionShuffle
{
    /// <summary>Stable seed for one question in one session.</summary>
    public static int Seed(Guid sessionId, Guid questionId)
    {
        Span<byte> bytes = stackalloc byte[32];
        sessionId.TryWriteBytes(bytes);
        questionId.TryWriteBytes(bytes[16..]);
        return BitConverter.ToInt32(SHA256.HashData(bytes));
    }

    /// <summary>
    /// Shuffles the options with Fisher–Yates. Options such as "All of the above" or "None of the above" refer to the
    /// others, so they keep their authored position and only the rest move around them.
    /// </summary>
    public static T[] Order<T>(IReadOnlyList<T> options, Func<T, string> text, int seed)
    {
        var result = options.ToArray();
        var movable = Enumerable.Range(0, result.Length).Where(i => !IsPinned(text(result[i]))).ToArray();
        var items = movable.Select(i => result[i]).ToArray();
        var rng = new Random(seed);
        for (var i = items.Length - 1; i > 0; i--)
        {
            var j = rng.Next(i + 1);
            (items[i], items[j]) = (items[j], items[i]);
        }
        for (var k = 0; k < movable.Length; k++) result[movable[k]] = items[k];
        return result;
    }

    /// <summary>Options whose meaning depends on the others ("All of the above", "Both A and B", "Nenhuma das anteriores").</summary>
    public static bool IsPinned(string text) => PinnedRx().IsMatch(text.Trim());

    [GeneratedRegex(
        @"^(all|none) of the (above|options|previous)\b|^(both|neither) [a-d] (and|nor) [a-d]\b|" +
        @"^(todas|nenhuma) (as|das) (alternativas |opções |opcoes )?anteriores\b|^(ambas|tanto) [a-d] (e|quanto) [a-d]\b",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex PinnedRx();
}
