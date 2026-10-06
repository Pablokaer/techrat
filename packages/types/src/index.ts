// Contracts are GENERATED from the backend OpenAPI document (scripts/generate-api-client.sh).
// Never edit schema.d.ts by hand; these aliases only give friendlier names.
import type { components, paths } from "./schema";

export type { components, paths };
type S = components["schemas"];

export type Difficulty = S["Difficulty"];
export type PracticeMode = S["PracticeMode"];
export type LevelDto = S["LevelDto"];
export type UserSummary = S["UserSummaryDto"];
export type Dashboard = S["DashboardDto"];
export type Profile = S["ProfileDto"];
export type TopicProgress = S["TopicProgressDto"];
export type Topic = S["TopicDto"];
export type TopicDetail = S["TopicDetailDto"];
export type Subtopic = S["SubtopicDto"];
export type TopicQuestion = S["TopicQuestionDto"];
export type LearnQuestionStatus = S["LearnQuestionStatus"];
export type PracticeSession = S["PracticeSessionDto"];
export type SessionQuestion = S["SessionQuestionDto"];
export type AnswerResult = S["AnswerResultDto"];
export type AnswerFeedback = S["AnswerFeedbackDto"];
export type StartPracticeRequest = S["StartPracticeRequest"];
export type RoadmapSummary = S["RoadmapSummaryDto"];
export type RoadmapDetail = S["RoadmapDetailDto"];
export type RoadmapStep = S["RoadmapStepDto"];
export type RoadmapModule = S["RoadmapModuleDto"];
export type RoadmapRef = S["RoadmapRefDto"];
export type RoadmapUserState = S["RoadmapUserStateDto"];
export type ModuleSummary = S["ModuleSummaryDto"];
export type ModuleDetail = S["ModuleDetailDto"];
export type ModuleKind = S["ModuleKind"];
export type Achievement = S["AchievementDto"];
export type Analytics = S["AnalyticsDto"];
export type Leaderboard = S["LeaderboardDto"];
export type LeaderboardEntry = S["LeaderboardEntryDto"];
export type LeaderboardScope = S["LeaderboardScope"];
export type SearchResult = S["SearchResultDto"];
export type NotificationList = S["NotificationListDto"];
export type DailyChallengeStatus = S["DailyChallengeStatusDto"];
export type AuthProvider = S["AuthProviderDto"];
export type AccessTokenResponse = S["AccessTokenResponse"];
export type AdminQuestion = S["AdminQuestionDto"];
export type AdminQuestionInput = S["AdminQuestionInput"];
export type AdminStats = S["AdminStatsDto"];
export type AdminUser = S["AdminUserDto"];
export type AdminModule = S["AdminModuleDto"];
export type AdminModuleInput = S["AdminModuleInput"];
export type AdminComposition = S["AdminCompositionDto"];
export type AdminRoadmapLink = S["AdminRoadmapLinkDto"];
export type AdminStepInput = S["AdminStepInput"];
export type CompletedStep = S["CompletedStepDto"];

export const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard", "Expert"];
