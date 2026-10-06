using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Routing;
using TechRat.Application.Administration;
using TechRat.Application.Identity;
using TechRat.Domain.Common;
using TechRat.Modules.Common;

namespace TechRat.Modules.Administration;

public sealed record IdResponse(Guid Id);

public sealed class AdminEndpoints : IEndpointModule
{
    public void Map(RouteGroupBuilder api)
    {
        var admin = api.MapGroup("/admin").WithTags("Administration").RequireAuthorization(Policies.Admin);

        admin.MapGet("/stats", async (AdminService svc, CancellationToken ct) => TypedResults.Ok(await svc.StatsAsync(ct)));

        admin.MapGet("/questions", async (string? topic, Difficulty? difficulty, string? search, bool? active, int? page, int? pageSize, AdminService svc, CancellationToken ct) =>
            TypedResults.Ok(await svc.ListQuestionsAsync(topic, difficulty, search, active, page, pageSize, ct)));
        admin.MapGet("/questions/{id:guid}", async (Guid id, AdminService svc, CancellationToken ct) => TypedResults.Ok(await svc.GetQuestionAsync(id, ct)));
        admin.MapPost("/questions", async (AdminQuestionInput input, AdminService svc, CancellationToken ct) =>
        {
            var q = await svc.CreateQuestionAsync(input, ct);
            return TypedResults.Created($"/api/v1/admin/questions/{q.Id}", q);
        });
        admin.MapPut("/questions/{id:guid}", async (Guid id, AdminQuestionInput input, AdminService svc, CancellationToken ct) =>
            TypedResults.Ok(await svc.UpdateQuestionAsync(id, input, ct)));
        admin.MapPost("/questions/{id:guid}/deactivate", async (Guid id, AdminService svc, CancellationToken ct) =>
        {
            await svc.SetQuestionActiveAsync(id, false, ct);
            return TypedResults.NoContent();
        });
        admin.MapPost("/questions/{id:guid}/activate", async (Guid id, AdminService svc, CancellationToken ct) =>
        {
            await svc.SetQuestionActiveAsync(id, true, ct);
            return TypedResults.NoContent();
        });

        admin.MapPost("/topics", async (AdminTopicInput input, AdminService svc, CancellationToken ct) =>
            TypedResults.Ok(new IdResponse(await svc.CreateTopicAsync(input, ct))));
        admin.MapPut("/topics/{slug}", async (string slug, AdminTopicInput input, AdminService svc, CancellationToken ct) =>
        {
            await svc.UpdateTopicAsync(slug, input, ct);
            return TypedResults.NoContent();
        });
        admin.MapPost("/topics/{slug}/subtopics", async (string slug, AdminSubtopicInput input, AdminService svc, CancellationToken ct) =>
            TypedResults.Ok(new IdResponse(await svc.CreateSubtopicAsync(slug, input, ct))));

        admin.MapPost("/roadmaps", async (AdminRoadmapInput input, AdminService svc, CancellationToken ct) =>
            TypedResults.Ok(new IdResponse(await svc.CreateRoadmapAsync(input, ct))));
        admin.MapPut("/roadmaps/{slug}", async (string slug, AdminRoadmapInput input, AdminService svc, CancellationToken ct) =>
        {
            await svc.UpdateRoadmapAsync(slug, input, ct);
            return TypedResults.NoContent();
        });
        admin.MapPost("/roadmaps/{slug}/steps", async (string slug, AdminStepInput input, AdminService svc, CancellationToken ct) =>
            TypedResults.Ok(new IdResponse(await svc.AddStepAsync(slug, input, ct))));
        admin.MapPut("/steps/{id:guid}", async (Guid id, AdminStepInput input, AdminService svc, CancellationToken ct) =>
        {
            await svc.UpdateStepAsync(id, input, ct);
            return TypedResults.NoContent();
        });

        admin.MapGet("/users", async (string? search, int? page, int? pageSize, AdminService svc, CancellationToken ct) =>
            TypedResults.Ok(await svc.ListUsersAsync(search, page, pageSize, ct)));
    }
}
