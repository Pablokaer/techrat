namespace TechRat.Application.Common;

public abstract class AppException(string message) : Exception(message);

public sealed class NotFoundException(string resource, object key)
    : AppException(Text.Get(Text.Keys.NotFound, Text.Resource(resource), key));

public sealed class ConflictException(string message) : AppException(message);

public sealed class ForbiddenException(string message) : AppException(message);

/// <summary>The email provider rejected the message or could not be reached (HTTP 502).</summary>
public sealed class EmailDeliveryException(string message) : AppException(message);

public sealed class RequestValidationException(IDictionary<string, string[]> errors)
    : AppException(Text.Get(Text.Keys.ValidationFailed))
{
    public IDictionary<string, string[]> Errors { get; } = errors;

    public static RequestValidationException For(string field, string message) =>
        new(new Dictionary<string, string[]> { [field] = [message] });
}

public static class Paging
{
    public static (int Page, int PageSize) Normalize(int? page, int? pageSize, int max = 100) =>
        (Math.Max(1, page ?? 1), Math.Clamp(pageSize ?? 20, 1, max));
}

public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount);
