using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TechRat.Application.Administration;
using TechRat.Application.Analytics;
using TechRat.Application.Catalog;
using TechRat.Application.Common;
using TechRat.Application.Gamification;
using TechRat.Application.Leaderboards;
using TechRat.Application.Notifications;
using TechRat.Application.Practice;
using TechRat.Application.Roadmaps;
using TechRat.Application.Users;

namespace TechRat.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<GamificationOptions>().Bind(configuration.GetSection(GamificationOptions.Section));
        services.AddSingleton(TimeProvider.System);
        services.AddSingleton<LevelService>();
        services.AddScoped<XpService>();
        services.AddScoped<AchievementService>();
        services.AddScoped<RoadmapProgressService>();
        services.AddScoped<RoadmapService>();
        services.AddScoped<ModuleService>();
        services.AddScoped<PracticeService>();
        services.AddScoped<DailyChallengeService>();
        services.AddScoped<ContentLocalizer>();
        services.AddScoped<CatalogService>();
        services.AddScoped<AnalyticsService>();
        services.AddScoped<LeaderboardService>();
        services.AddScoped<ProfileService>();
        services.AddScoped<AvatarService>();
        services.AddScoped<TechRat.Application.Resources.StudyResourceService>();
        services.AddScoped<TechRat.Application.Identity.ResetEmailThrottle>();
        services.AddScoped<NotificationService>();
        services.AddScoped<AdminService>();
        services.AddScoped<IOutboxHandler, UserProgressChangedHandler>();
        return services;
    }
}
