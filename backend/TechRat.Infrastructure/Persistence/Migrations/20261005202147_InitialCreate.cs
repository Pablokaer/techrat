using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace TechRat.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "gamification");

            migrationBuilder.EnsureSchema(
                name: "learning");

            migrationBuilder.EnsureSchema(
                name: "identity");

            migrationBuilder.EnsureSchema(
                name: "notifications");

            migrationBuilder.EnsureSchema(
                name: "infrastructure");

            migrationBuilder.EnsureSchema(
                name: "content");

            migrationBuilder.EnsureSchema(
                name: "roadmaps");

            migrationBuilder.CreateTable(
                name: "achievements",
                schema: "gamification",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    name = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    description = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    category = table.Column<string>(type: "text", nullable: false),
                    icon = table.Column<string>(type: "text", nullable: false),
                    tier = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    rule_type = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    threshold = table.Column<int>(type: "integer", nullable: false),
                    target_slug = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    secondary_threshold = table.Column<int>(type: "integer", nullable: true),
                    xp_reward = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_achievements", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "data_protection_keys",
                schema: "identity",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    friendly_name = table.Column<string>(type: "text", nullable: true),
                    xml = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_data_protection_keys", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "outbox_messages",
                schema: "infrastructure",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    payload = table.Column<string>(type: "jsonb", nullable: false),
                    occurred_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    processed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    attempts = table.Column<int>(type: "integer", nullable: false),
                    last_error = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_outbox_messages", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "roadmaps",
                schema: "roadmaps",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    slug = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    category = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    difficulty = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    estimated_hours = table.Column<int>(type: "integer", nullable: false),
                    steps_count = table.Column<int>(type: "integer", nullable: false),
                    icon = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    is_published = table.Column<bool>(type: "boolean", nullable: false),
                    display_order = table.Column<int>(type: "integer", nullable: false),
                    xp_reward = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_roadmaps", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "roles",
                schema: "identity",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    normalized_name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    concurrency_stamp = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_roles", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "topics",
                schema: "content",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    slug = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    name = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    category = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    icon = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    display_order = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_topics", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                schema: "identity",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    normalized_user_name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    normalized_email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    email_confirmed = table.Column<bool>(type: "boolean", nullable: false),
                    password_hash = table.Column<string>(type: "text", nullable: true),
                    security_stamp = table.Column<string>(type: "text", nullable: true),
                    concurrency_stamp = table.Column<string>(type: "text", nullable: true),
                    phone_number = table.Column<string>(type: "text", nullable: true),
                    phone_number_confirmed = table.Column<bool>(type: "boolean", nullable: false),
                    two_factor_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    lockout_end = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    lockout_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    access_failed_count = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_users", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "roadmap_dependencies",
                schema: "roadmaps",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    roadmap_id = table.Column<Guid>(type: "uuid", nullable: false),
                    required_roadmap_id = table.Column<Guid>(type: "uuid", nullable: false),
                    minimum_percent = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_roadmap_dependencies", x => x.id);
                    table.ForeignKey(
                        name: "fk_roadmap_dependencies_roadmaps_required_roadmap_id",
                        column: x => x.required_roadmap_id,
                        principalSchema: "roadmaps",
                        principalTable: "roadmaps",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_roadmap_dependencies_roadmaps_roadmap_id",
                        column: x => x.roadmap_id,
                        principalSchema: "roadmaps",
                        principalTable: "roadmaps",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "roadmap_modules",
                schema: "roadmaps",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    roadmap_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    order = table.Column<int>(type: "integer", nullable: false),
                    xp_reward = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_roadmap_modules", x => x.id);
                    table.ForeignKey(
                        name: "fk_roadmap_modules_roadmaps_roadmap_id",
                        column: x => x.roadmap_id,
                        principalSchema: "roadmaps",
                        principalTable: "roadmaps",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "role_claims",
                schema: "identity",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    role_id = table.Column<Guid>(type: "uuid", nullable: false),
                    claim_type = table.Column<string>(type: "text", nullable: true),
                    claim_value = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_role_claims", x => x.id);
                    table.ForeignKey(
                        name: "fk_role_claims_roles_role_id",
                        column: x => x.role_id,
                        principalSchema: "identity",
                        principalTable: "roles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "subtopics",
                schema: "content",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    topic_id = table.Column<Guid>(type: "uuid", nullable: false),
                    slug = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    name = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    display_order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_subtopics", x => x.id);
                    table.ForeignKey(
                        name: "fk_subtopics_topics_topic_id",
                        column: x => x.topic_id,
                        principalSchema: "content",
                        principalTable: "topics",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_claims",
                schema: "identity",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    claim_type = table.Column<string>(type: "text", nullable: true),
                    claim_value = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_user_claims", x => x.id);
                    table.ForeignKey(
                        name: "fk_user_claims_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_logins",
                schema: "identity",
                columns: table => new
                {
                    login_provider = table.Column<string>(type: "text", nullable: false),
                    provider_key = table.Column<string>(type: "text", nullable: false),
                    provider_display_name = table.Column<string>(type: "text", nullable: true),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_user_logins", x => new { x.login_provider, x.provider_key });
                    table.ForeignKey(
                        name: "fk_user_logins_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_roles",
                schema: "identity",
                columns: table => new
                {
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    role_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_user_roles", x => new { x.user_id, x.role_id });
                    table.ForeignKey(
                        name: "fk_user_roles_roles_role_id",
                        column: x => x.role_id,
                        principalSchema: "identity",
                        principalTable: "roles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_user_roles_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_tokens",
                schema: "identity",
                columns: table => new
                {
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    login_provider = table.Column<string>(type: "text", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    value = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_user_tokens", x => new { x.user_id, x.login_provider, x.name });
                    table.ForeignKey(
                        name: "fk_user_tokens_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "users",
                schema: "learning",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    username = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    display_name = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    avatar_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    bio = table.Column<string>(type: "character varying(280)", maxLength: 280, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    last_login_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    current_global_level = table.Column<int>(type: "integer", nullable: false),
                    current_global_xp = table.Column<long>(type: "bigint", nullable: false),
                    current_streak = table.Column<int>(type: "integer", nullable: false),
                    longest_streak = table.Column<int>(type: "integer", nullable: false),
                    last_activity_date = table.Column<DateOnly>(type: "date", nullable: true),
                    questions_answered = table.Column<int>(type: "integer", nullable: false),
                    correct_answers = table.Column<int>(type: "integer", nullable: false),
                    global_accuracy = table.Column<double>(type: "double precision", nullable: false),
                    global_rank = table.Column<int>(type: "integer", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_users1", x => x.id);
                    table.ForeignKey(
                        name: "fk_users_users_id",
                        column: x => x.id,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "questions",
                schema: "content",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    external_key = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    topic_id = table.Column<Guid>(type: "uuid", nullable: false),
                    subtopic_id = table.Column<Guid>(type: "uuid", nullable: false),
                    difficulty = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    question_type = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    title = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    question_text = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    explanation = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    reference_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    xp_reward = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_questions", x => x.id);
                    table.ForeignKey(
                        name: "fk_questions_subtopics_subtopic_id",
                        column: x => x.subtopic_id,
                        principalSchema: "content",
                        principalTable: "subtopics",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_questions_topics_topic_id",
                        column: x => x.topic_id,
                        principalSchema: "content",
                        principalTable: "topics",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "roadmap_steps",
                schema: "roadmaps",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    roadmap_id = table.Column<Guid>(type: "uuid", nullable: false),
                    module_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    order = table.Column<int>(type: "integer", nullable: false),
                    difficulty = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    estimated_minutes = table.Column<int>(type: "integer", nullable: false),
                    topic_id = table.Column<Guid>(type: "uuid", nullable: false),
                    subtopic_id = table.Column<Guid>(type: "uuid", nullable: true),
                    minimum_questions = table.Column<int>(type: "integer", nullable: false),
                    minimum_accuracy = table.Column<int>(type: "integer", nullable: false),
                    xp_reward = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_roadmap_steps", x => x.id);
                    table.ForeignKey(
                        name: "fk_roadmap_steps_roadmap_modules_module_id",
                        column: x => x.module_id,
                        principalSchema: "roadmaps",
                        principalTable: "roadmap_modules",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_roadmap_steps_roadmaps_roadmap_id",
                        column: x => x.roadmap_id,
                        principalSchema: "roadmaps",
                        principalTable: "roadmaps",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_roadmap_steps_subtopics_subtopic_id",
                        column: x => x.subtopic_id,
                        principalSchema: "content",
                        principalTable: "subtopics",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_roadmap_steps_topics_topic_id",
                        column: x => x.topic_id,
                        principalSchema: "content",
                        principalTable: "topics",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "daily_challenge_completions",
                schema: "learning",
                columns: table => new
                {
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    practice_session_id = table.Column<Guid>(type: "uuid", nullable: false),
                    correct_count = table.Column<int>(type: "integer", nullable: false),
                    bonus_xp = table.Column<int>(type: "integer", nullable: false),
                    completed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_daily_challenge_completions", x => new { x.user_id, x.date });
                    table.ForeignKey(
                        name: "fk_daily_challenge_completions_user_profiles_user_id",
                        column: x => x.user_id,
                        principalSchema: "learning",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "notifications",
                schema: "notifications",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    type = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    body = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    read_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_notifications", x => x.id);
                    table.ForeignKey(
                        name: "fk_notifications_user_profiles_user_id",
                        column: x => x.user_id,
                        principalSchema: "learning",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "practice_sessions",
                schema: "learning",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    mode = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    topic_id = table.Column<Guid>(type: "uuid", nullable: true),
                    subtopic_id = table.Column<Guid>(type: "uuid", nullable: true),
                    difficulty = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    roadmap_step_id = table.Column<Guid>(type: "uuid", nullable: true),
                    challenge_date = table.Column<DateOnly>(type: "date", nullable: true),
                    question_ids = table.Column<List<Guid>>(type: "uuid[]", nullable: false),
                    answered_count = table.Column<int>(type: "integer", nullable: false),
                    correct_count = table.Column<int>(type: "integer", nullable: false),
                    xp_earned = table.Column<int>(type: "integer", nullable: false),
                    started_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    completed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_practice_sessions", x => x.id);
                    table.ForeignKey(
                        name: "fk_practice_sessions_user_profiles_user_id",
                        column: x => x.user_id,
                        principalSchema: "learning",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_achievements",
                schema: "gamification",
                columns: table => new
                {
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    achievement_id = table.Column<Guid>(type: "uuid", nullable: false),
                    unlocked_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_user_achievements", x => new { x.user_id, x.achievement_id });
                    table.ForeignKey(
                        name: "fk_user_achievements_achievements_achievement_id",
                        column: x => x.achievement_id,
                        principalSchema: "gamification",
                        principalTable: "achievements",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_user_achievements_user_profiles_user_id",
                        column: x => x.user_id,
                        principalSchema: "learning",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_roadmap_progress",
                schema: "roadmaps",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    roadmap_id = table.Column<Guid>(type: "uuid", nullable: false),
                    completed_steps = table.Column<int>(type: "integer", nullable: false),
                    current_step_id = table.Column<Guid>(type: "uuid", nullable: true),
                    started_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    last_activity_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    completed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_user_roadmap_progress", x => x.id);
                    table.ForeignKey(
                        name: "fk_user_roadmap_progress_roadmaps_roadmap_id",
                        column: x => x.roadmap_id,
                        principalSchema: "roadmaps",
                        principalTable: "roadmaps",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_user_roadmap_progress_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "learning",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_topic_progress",
                schema: "learning",
                columns: table => new
                {
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    topic_id = table.Column<Guid>(type: "uuid", nullable: false),
                    xp = table.Column<long>(type: "bigint", nullable: false),
                    level = table.Column<int>(type: "integer", nullable: false),
                    questions_answered = table.Column<int>(type: "integer", nullable: false),
                    correct_answers = table.Column<int>(type: "integer", nullable: false),
                    accuracy = table.Column<double>(type: "double precision", nullable: false),
                    easy_answered = table.Column<int>(type: "integer", nullable: false),
                    easy_correct = table.Column<int>(type: "integer", nullable: false),
                    medium_answered = table.Column<int>(type: "integer", nullable: false),
                    medium_correct = table.Column<int>(type: "integer", nullable: false),
                    hard_answered = table.Column<int>(type: "integer", nullable: false),
                    hard_correct = table.Column<int>(type: "integer", nullable: false),
                    expert_answered = table.Column<int>(type: "integer", nullable: false),
                    expert_correct = table.Column<int>(type: "integer", nullable: false),
                    last_activity_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_user_topic_progress", x => new { x.user_id, x.topic_id });
                    table.ForeignKey(
                        name: "fk_user_topic_progress_topics_topic_id",
                        column: x => x.topic_id,
                        principalSchema: "content",
                        principalTable: "topics",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_user_topic_progress_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "learning",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "xp_transactions",
                schema: "gamification",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    amount = table.Column<int>(type: "integer", nullable: false),
                    reason = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    source_type = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    source_id = table.Column<Guid>(type: "uuid", nullable: true),
                    topic_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_xp_transactions", x => x.id);
                    table.ForeignKey(
                        name: "fk_xp_transactions_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "learning",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "question_options",
                schema: "content",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    question_id = table.Column<Guid>(type: "uuid", nullable: false),
                    text = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    is_correct = table.Column<bool>(type: "boolean", nullable: false),
                    display_order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_question_options", x => x.id);
                    table.ForeignKey(
                        name: "fk_question_options_questions_question_id",
                        column: x => x.question_id,
                        principalSchema: "content",
                        principalTable: "questions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_roadmap_step_completions",
                schema: "roadmaps",
                columns: table => new
                {
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    roadmap_step_id = table.Column<Guid>(type: "uuid", nullable: false),
                    roadmap_id = table.Column<Guid>(type: "uuid", nullable: false),
                    completed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_user_roadmap_step_completions", x => new { x.user_id, x.roadmap_step_id });
                    table.ForeignKey(
                        name: "fk_user_roadmap_step_completions_roadmap_steps_roadmap_step_id",
                        column: x => x.roadmap_step_id,
                        principalSchema: "roadmaps",
                        principalTable: "roadmap_steps",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_user_roadmap_step_completions_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "learning",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "question_attempts",
                schema: "learning",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    question_id = table.Column<Guid>(type: "uuid", nullable: false),
                    selected_option_id = table.Column<Guid>(type: "uuid", nullable: false),
                    is_correct = table.Column<bool>(type: "boolean", nullable: false),
                    time_spent_seconds = table.Column<int>(type: "integer", nullable: false),
                    difficulty = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    xp_earned = table.Column<int>(type: "integer", nullable: false),
                    answered_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    practice_session_id = table.Column<Guid>(type: "uuid", nullable: true),
                    topic_id = table.Column<Guid>(type: "uuid", nullable: false),
                    subtopic_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_question_attempts", x => x.id);
                    table.ForeignKey(
                        name: "fk_question_attempts_practice_sessions_practice_session_id",
                        column: x => x.practice_session_id,
                        principalSchema: "learning",
                        principalTable: "practice_sessions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_question_attempts_question_options_selected_option_id",
                        column: x => x.selected_option_id,
                        principalSchema: "content",
                        principalTable: "question_options",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_question_attempts_questions_question_id",
                        column: x => x.question_id,
                        principalSchema: "content",
                        principalTable: "questions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_question_attempts_user_profiles_user_id",
                        column: x => x.user_id,
                        principalSchema: "learning",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_achievements_code",
                schema: "gamification",
                table: "achievements",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_notifications_user_id_created_at",
                schema: "notifications",
                table: "notifications",
                columns: new[] { "user_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_outbox_messages_occurred_at",
                schema: "infrastructure",
                table: "outbox_messages",
                column: "occurred_at",
                filter: "processed_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "ix_practice_sessions_user_id_mode_challenge_date",
                schema: "learning",
                table: "practice_sessions",
                columns: new[] { "user_id", "mode", "challenge_date" });

            migrationBuilder.CreateIndex(
                name: "ix_practice_sessions_user_id_started_at",
                schema: "learning",
                table: "practice_sessions",
                columns: new[] { "user_id", "started_at" });

            migrationBuilder.CreateIndex(
                name: "ix_question_attempts_answered_at",
                schema: "learning",
                table: "question_attempts",
                column: "answered_at");

            migrationBuilder.CreateIndex(
                name: "ix_question_attempts_practice_session_id_question_id",
                schema: "learning",
                table: "question_attempts",
                columns: new[] { "practice_session_id", "question_id" },
                unique: true,
                filter: "practice_session_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_question_attempts_question_id",
                schema: "learning",
                table: "question_attempts",
                column: "question_id");

            migrationBuilder.CreateIndex(
                name: "ix_question_attempts_selected_option_id",
                schema: "learning",
                table: "question_attempts",
                column: "selected_option_id");

            migrationBuilder.CreateIndex(
                name: "ix_question_attempts_user_id_answered_at",
                schema: "learning",
                table: "question_attempts",
                columns: new[] { "user_id", "answered_at" });

            migrationBuilder.CreateIndex(
                name: "ix_question_attempts_user_id_question_id",
                schema: "learning",
                table: "question_attempts",
                columns: new[] { "user_id", "question_id" });

            migrationBuilder.CreateIndex(
                name: "ix_question_attempts_user_id_topic_id_subtopic_id",
                schema: "learning",
                table: "question_attempts",
                columns: new[] { "user_id", "topic_id", "subtopic_id" });

            migrationBuilder.CreateIndex(
                name: "ix_question_options_question_id_display_order",
                schema: "content",
                table: "question_options",
                columns: new[] { "question_id", "display_order" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_questions_difficulty",
                schema: "content",
                table: "questions",
                column: "difficulty");

            migrationBuilder.CreateIndex(
                name: "ix_questions_external_key",
                schema: "content",
                table: "questions",
                column: "external_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_questions_subtopic_id",
                schema: "content",
                table: "questions",
                column: "subtopic_id");

            migrationBuilder.CreateIndex(
                name: "ix_questions_topic_id_difficulty",
                schema: "content",
                table: "questions",
                columns: new[] { "topic_id", "difficulty" });

            migrationBuilder.CreateIndex(
                name: "ix_roadmap_dependencies_required_roadmap_id",
                schema: "roadmaps",
                table: "roadmap_dependencies",
                column: "required_roadmap_id");

            migrationBuilder.CreateIndex(
                name: "ix_roadmap_dependencies_roadmap_id_required_roadmap_id",
                schema: "roadmaps",
                table: "roadmap_dependencies",
                columns: new[] { "roadmap_id", "required_roadmap_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_roadmap_modules_roadmap_id_order",
                schema: "roadmaps",
                table: "roadmap_modules",
                columns: new[] { "roadmap_id", "order" });

            migrationBuilder.CreateIndex(
                name: "ix_roadmap_steps_module_id",
                schema: "roadmaps",
                table: "roadmap_steps",
                column: "module_id");

            migrationBuilder.CreateIndex(
                name: "ix_roadmap_steps_roadmap_id_order",
                schema: "roadmaps",
                table: "roadmap_steps",
                columns: new[] { "roadmap_id", "order" });

            migrationBuilder.CreateIndex(
                name: "ix_roadmap_steps_subtopic_id",
                schema: "roadmaps",
                table: "roadmap_steps",
                column: "subtopic_id");

            migrationBuilder.CreateIndex(
                name: "ix_roadmap_steps_topic_id",
                schema: "roadmaps",
                table: "roadmap_steps",
                column: "topic_id");

            migrationBuilder.CreateIndex(
                name: "ix_roadmaps_slug",
                schema: "roadmaps",
                table: "roadmaps",
                column: "slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_role_claims_role_id",
                schema: "identity",
                table: "role_claims",
                column: "role_id");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                schema: "identity",
                table: "roles",
                column: "normalized_name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_subtopics_topic_id_slug",
                schema: "content",
                table: "subtopics",
                columns: new[] { "topic_id", "slug" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_topics_slug",
                schema: "content",
                table: "topics",
                column: "slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_user_achievements_achievement_id",
                schema: "gamification",
                table: "user_achievements",
                column: "achievement_id");

            migrationBuilder.CreateIndex(
                name: "ix_user_claims_user_id",
                schema: "identity",
                table: "user_claims",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_user_logins_user_id",
                schema: "identity",
                table: "user_logins",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_user_roadmap_progress_roadmap_id",
                schema: "roadmaps",
                table: "user_roadmap_progress",
                column: "roadmap_id");

            migrationBuilder.CreateIndex(
                name: "ix_user_roadmap_progress_user_id_roadmap_id",
                schema: "roadmaps",
                table: "user_roadmap_progress",
                columns: new[] { "user_id", "roadmap_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_user_roadmap_step_completions_roadmap_step_id",
                schema: "roadmaps",
                table: "user_roadmap_step_completions",
                column: "roadmap_step_id");

            migrationBuilder.CreateIndex(
                name: "ix_user_roadmap_step_completions_user_id_roadmap_id",
                schema: "roadmaps",
                table: "user_roadmap_step_completions",
                columns: new[] { "user_id", "roadmap_id" });

            migrationBuilder.CreateIndex(
                name: "ix_user_roles_role_id",
                schema: "identity",
                table: "user_roles",
                column: "role_id");

            migrationBuilder.CreateIndex(
                name: "ix_user_topic_progress_topic_id_xp",
                schema: "learning",
                table: "user_topic_progress",
                columns: new[] { "topic_id", "xp" });

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                schema: "identity",
                table: "users",
                column: "normalized_email");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                schema: "identity",
                table: "users",
                column: "normalized_user_name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_users_current_global_xp",
                schema: "learning",
                table: "users",
                column: "current_global_xp");

            migrationBuilder.CreateIndex(
                name: "ix_users_username",
                schema: "learning",
                table: "users",
                column: "username",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_xp_transactions_created_at",
                schema: "gamification",
                table: "xp_transactions",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "ix_xp_transactions_user_id_created_at",
                schema: "gamification",
                table: "xp_transactions",
                columns: new[] { "user_id", "created_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "daily_challenge_completions",
                schema: "learning");

            migrationBuilder.DropTable(
                name: "data_protection_keys",
                schema: "identity");

            migrationBuilder.DropTable(
                name: "notifications",
                schema: "notifications");

            migrationBuilder.DropTable(
                name: "outbox_messages",
                schema: "infrastructure");

            migrationBuilder.DropTable(
                name: "question_attempts",
                schema: "learning");

            migrationBuilder.DropTable(
                name: "roadmap_dependencies",
                schema: "roadmaps");

            migrationBuilder.DropTable(
                name: "role_claims",
                schema: "identity");

            migrationBuilder.DropTable(
                name: "user_achievements",
                schema: "gamification");

            migrationBuilder.DropTable(
                name: "user_claims",
                schema: "identity");

            migrationBuilder.DropTable(
                name: "user_logins",
                schema: "identity");

            migrationBuilder.DropTable(
                name: "user_roadmap_progress",
                schema: "roadmaps");

            migrationBuilder.DropTable(
                name: "user_roadmap_step_completions",
                schema: "roadmaps");

            migrationBuilder.DropTable(
                name: "user_roles",
                schema: "identity");

            migrationBuilder.DropTable(
                name: "user_tokens",
                schema: "identity");

            migrationBuilder.DropTable(
                name: "user_topic_progress",
                schema: "learning");

            migrationBuilder.DropTable(
                name: "xp_transactions",
                schema: "gamification");

            migrationBuilder.DropTable(
                name: "practice_sessions",
                schema: "learning");

            migrationBuilder.DropTable(
                name: "question_options",
                schema: "content");

            migrationBuilder.DropTable(
                name: "achievements",
                schema: "gamification");

            migrationBuilder.DropTable(
                name: "roadmap_steps",
                schema: "roadmaps");

            migrationBuilder.DropTable(
                name: "roles",
                schema: "identity");

            migrationBuilder.DropTable(
                name: "users",
                schema: "learning");

            migrationBuilder.DropTable(
                name: "questions",
                schema: "content");

            migrationBuilder.DropTable(
                name: "roadmap_modules",
                schema: "roadmaps");

            migrationBuilder.DropTable(
                name: "users",
                schema: "identity");

            migrationBuilder.DropTable(
                name: "subtopics",
                schema: "content");

            migrationBuilder.DropTable(
                name: "roadmaps",
                schema: "roadmaps");

            migrationBuilder.DropTable(
                name: "topics",
                schema: "content");
        }
    }
}
