using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TechRat.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ReusableModuleCatalog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "composition_seed_managed",
                schema: "roadmaps",
                table: "roadmaps",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.CreateTable(
                name: "modules",
                schema: "roadmaps",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    slug = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    kind = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    category = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    level = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    icon = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    estimated_minutes = table.Column<int>(type: "integer", nullable: false),
                    xp_reward = table.Column<int>(type: "integer", nullable: false),
                    version = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    is_published = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    is_standalone = table.Column<bool>(type: "boolean", nullable: false),
                    display_order = table.Column<int>(type: "integer", nullable: false),
                    seed_managed = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_modules", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "module_dependencies",
                schema: "roadmaps",
                columns: table => new
                {
                    module_id = table.Column<Guid>(type: "uuid", nullable: false),
                    required_module_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_module_dependencies", x => new { x.module_id, x.required_module_id });
                    table.ForeignKey(
                        name: "fk_module_dependencies_modules_module_id",
                        column: x => x.module_id,
                        principalSchema: "roadmaps",
                        principalTable: "modules",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_module_dependencies_modules_required_module_id",
                        column: x => x.required_module_id,
                        principalSchema: "roadmaps",
                        principalTable: "modules",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "module_steps",
                schema: "roadmaps",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    module_id = table.Column<Guid>(type: "uuid", nullable: false),
                    order = table.Column<int>(type: "integer", nullable: false),
                    title = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    difficulty = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    estimated_minutes = table.Column<int>(type: "integer", nullable: false),
                    topic_id = table.Column<Guid>(type: "uuid", nullable: false),
                    subtopic_id = table.Column<Guid>(type: "uuid", nullable: true),
                    minimum_questions = table.Column<int>(type: "integer", nullable: false),
                    minimum_accuracy = table.Column<int>(type: "integer", nullable: false),
                    xp_reward = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    added_in_version = table.Column<int>(type: "integer", nullable: false, defaultValue: 1)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_module_steps", x => x.id);
                    table.ForeignKey(
                        name: "fk_module_steps_modules_module_id",
                        column: x => x.module_id,
                        principalSchema: "roadmaps",
                        principalTable: "modules",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_module_steps_subtopics_subtopic_id",
                        column: x => x.subtopic_id,
                        principalSchema: "content",
                        principalTable: "subtopics",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_module_steps_topics_topic_id",
                        column: x => x.topic_id,
                        principalSchema: "content",
                        principalTable: "topics",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "roadmap_module_links",
                schema: "roadmaps",
                columns: table => new
                {
                    roadmap_id = table.Column<Guid>(type: "uuid", nullable: false),
                    module_id = table.Column<Guid>(type: "uuid", nullable: false),
                    order = table.Column<int>(type: "integer", nullable: false),
                    is_required = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_roadmap_module_links", x => new { x.roadmap_id, x.module_id });
                    table.ForeignKey(
                        name: "fk_roadmap_module_links_learning_modules_module_id",
                        column: x => x.module_id,
                        principalSchema: "roadmaps",
                        principalTable: "modules",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_roadmap_module_links_roadmaps_roadmap_id",
                        column: x => x.roadmap_id,
                        principalSchema: "roadmaps",
                        principalTable: "roadmaps",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_module_progress",
                schema: "roadmaps",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    module_id = table.Column<Guid>(type: "uuid", nullable: false),
                    completed_steps = table.Column<int>(type: "integer", nullable: false),
                    started_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    completed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    completed_version = table.Column<int>(type: "integer", nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_user_module_progress", x => x.id);
                    table.ForeignKey(
                        name: "fk_user_module_progress_modules_module_id",
                        column: x => x.module_id,
                        principalSchema: "roadmaps",
                        principalTable: "modules",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_user_module_progress_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "learning",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_module_step_completions",
                schema: "roadmaps",
                columns: table => new
                {
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    module_step_id = table.Column<Guid>(type: "uuid", nullable: false),
                    module_id = table.Column<Guid>(type: "uuid", nullable: false),
                    completed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xp_awarded = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_user_module_step_completions", x => new { x.user_id, x.module_step_id });
                    table.ForeignKey(
                        name: "fk_user_module_step_completions_module_steps_module_step_id",
                        column: x => x.module_step_id,
                        principalSchema: "roadmaps",
                        principalTable: "module_steps",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_user_module_step_completions_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "learning",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_module_dependencies_required_module_id",
                schema: "roadmaps",
                table: "module_dependencies",
                column: "required_module_id");

            migrationBuilder.CreateIndex(
                name: "ix_module_steps_module_id_order",
                schema: "roadmaps",
                table: "module_steps",
                columns: new[] { "module_id", "order" });

            migrationBuilder.CreateIndex(
                name: "ix_module_steps_subtopic_id",
                schema: "roadmaps",
                table: "module_steps",
                column: "subtopic_id");

            migrationBuilder.CreateIndex(
                name: "ix_module_steps_topic_id_subtopic_id",
                schema: "roadmaps",
                table: "module_steps",
                columns: new[] { "topic_id", "subtopic_id" });

            migrationBuilder.CreateIndex(
                name: "ix_modules_kind_category",
                schema: "roadmaps",
                table: "modules",
                columns: new[] { "kind", "category" });

            migrationBuilder.CreateIndex(
                name: "ix_modules_slug",
                schema: "roadmaps",
                table: "modules",
                column: "slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_roadmap_module_links_module_id",
                schema: "roadmaps",
                table: "roadmap_module_links",
                column: "module_id");

            migrationBuilder.CreateIndex(
                name: "ix_roadmap_module_links_roadmap_id_order",
                schema: "roadmaps",
                table: "roadmap_module_links",
                columns: new[] { "roadmap_id", "order" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_user_module_progress_module_id",
                schema: "roadmaps",
                table: "user_module_progress",
                column: "module_id");

            migrationBuilder.CreateIndex(
                name: "ix_user_module_progress_user_id_module_id",
                schema: "roadmaps",
                table: "user_module_progress",
                columns: new[] { "user_id", "module_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_user_module_step_completions_module_step_id",
                schema: "roadmaps",
                table: "user_module_step_completions",
                column: "module_step_id");

            migrationBuilder.CreateIndex(
                name: "ix_user_module_step_completions_user_id_module_id",
                schema: "roadmaps",
                table: "user_module_step_completions",
                columns: new[] { "user_id", "module_id" });

            // ---- Data migration (ADR-0012): every old roadmap module/step becomes a catalog module/step with the SAME id,
            // so completions, current steps, practice sessions, XP ledger entries and translations keep pointing at valid rows.
            // Safe on an empty database and re-runnable (ON CONFLICT DO NOTHING). Curation (shared modules) happens in the seeder.
            migrationBuilder.Sql("""
                INSERT INTO roadmaps.modules (id, slug, name, description, kind, category, level, icon, estimated_minutes, xp_reward,
                                              version, is_published, is_standalone, display_order, seed_managed)
                SELECT m.id,
                       left('legacy-' || r.slug || '-' || m."order", 80),
                       m.title, '', 'Context', r.category, r.difficulty, r.icon,
                       COALESCE((SELECT sum(s.estimated_minutes) FROM roadmaps.roadmap_steps s WHERE s.module_id = m.id), 0),
                       m.xp_reward, 1, true, false,
                       (row_number() OVER (ORDER BY r.display_order, m."order"))::int,
                       true
                FROM roadmaps.roadmap_modules m
                JOIN roadmaps.roadmaps r ON r.id = m.roadmap_id
                ON CONFLICT DO NOTHING;

                INSERT INTO roadmaps.module_steps (id, module_id, "order", title, description, difficulty, estimated_minutes, topic_id, subtopic_id,
                                                   minimum_questions, minimum_accuracy, xp_reward, is_active, added_in_version)
                SELECT s.id, s.module_id,
                       (row_number() OVER (PARTITION BY s.module_id ORDER BY s."order"))::int,
                       s.title, s.description, s.difficulty, s.estimated_minutes, s.topic_id, s.subtopic_id,
                       s.minimum_questions, s.minimum_accuracy, s.xp_reward, true, 1
                FROM roadmaps.roadmap_steps s
                ON CONFLICT DO NOTHING;

                INSERT INTO roadmaps.roadmap_module_links (roadmap_id, module_id, "order", is_required)
                SELECT m.roadmap_id, m.id, (row_number() OVER (PARTITION BY m.roadmap_id ORDER BY m."order"))::int, true
                FROM roadmaps.roadmap_modules m
                ON CONFLICT DO NOTHING;

                INSERT INTO roadmaps.user_module_step_completions (user_id, module_step_id, module_id, completed_at, xp_awarded)
                SELECT c.user_id, c.roadmap_step_id, s.module_id, c.completed_at, true
                FROM roadmaps.user_roadmap_step_completions c
                JOIN roadmaps.roadmap_steps s ON s.id = c.roadmap_step_id
                ON CONFLICT DO NOTHING;

                INSERT INTO roadmaps.user_module_progress (id, user_id, module_id, completed_steps, started_at, completed_at, completed_version)
                SELECT gen_random_uuid(), c.user_id, c.module_id, count(*), min(c.completed_at),
                       CASE WHEN count(*) >= (SELECT count(*) FROM roadmaps.module_steps s WHERE s.module_id = c.module_id) THEN max(c.completed_at) END,
                       CASE WHEN count(*) >= (SELECT count(*) FROM roadmaps.module_steps s WHERE s.module_id = c.module_id) THEN 1 END
                FROM roadmaps.user_module_step_completions c
                GROUP BY c.user_id, c.module_id
                ON CONFLICT DO NOTHING;

                UPDATE roadmaps.user_roadmap_progress rp
                SET completed_steps = x.done
                FROM (SELECT rp2.id, count(c.module_step_id) AS done
                      FROM roadmaps.user_roadmap_progress rp2
                      JOIN roadmaps.roadmap_module_links l ON l.roadmap_id = rp2.roadmap_id AND l.is_required
                      LEFT JOIN roadmaps.user_module_step_completions c ON c.user_id = rp2.user_id AND c.module_id = l.module_id
                      GROUP BY rp2.id) x
                WHERE rp.id = x.id;

                UPDATE content.content_translations SET entity_type = 'module', field = 'name'
                WHERE entity_type = 'roadmap-module' AND field = 'title';
                UPDATE content.content_translations SET entity_type = 'module-step'
                WHERE entity_type = 'roadmap-step';
                """);

            migrationBuilder.DropTable(
                name: "user_roadmap_step_completions",
                schema: "roadmaps");

            migrationBuilder.DropTable(
                name: "roadmap_steps",
                schema: "roadmaps");

            migrationBuilder.DropTable(
                name: "roadmap_modules",
                schema: "roadmaps");

        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Schema only: the module catalog data is not converted back to per-roadmap modules.
            migrationBuilder.DropTable(
                name: "module_dependencies",
                schema: "roadmaps");

            migrationBuilder.DropTable(
                name: "roadmap_module_links",
                schema: "roadmaps");

            migrationBuilder.DropTable(
                name: "user_module_progress",
                schema: "roadmaps");

            migrationBuilder.DropTable(
                name: "user_module_step_completions",
                schema: "roadmaps");

            migrationBuilder.DropTable(
                name: "module_steps",
                schema: "roadmaps");

            migrationBuilder.DropTable(
                name: "modules",
                schema: "roadmaps");

            migrationBuilder.DropColumn(
                name: "composition_seed_managed",
                schema: "roadmaps",
                table: "roadmaps");

            migrationBuilder.CreateTable(
                name: "roadmap_modules",
                schema: "roadmaps",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    order = table.Column<int>(type: "integer", nullable: false),
                    roadmap_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
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
                name: "roadmap_steps",
                schema: "roadmaps",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    difficulty = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    estimated_minutes = table.Column<int>(type: "integer", nullable: false),
                    minimum_accuracy = table.Column<int>(type: "integer", nullable: false),
                    minimum_questions = table.Column<int>(type: "integer", nullable: false),
                    module_id = table.Column<Guid>(type: "uuid", nullable: false),
                    order = table.Column<int>(type: "integer", nullable: false),
                    roadmap_id = table.Column<Guid>(type: "uuid", nullable: false),
                    subtopic_id = table.Column<Guid>(type: "uuid", nullable: true),
                    title = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    topic_id = table.Column<Guid>(type: "uuid", nullable: false),
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
                name: "user_roadmap_step_completions",
                schema: "roadmaps",
                columns: table => new
                {
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    roadmap_step_id = table.Column<Guid>(type: "uuid", nullable: false),
                    completed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    roadmap_id = table.Column<Guid>(type: "uuid", nullable: false)
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
                name: "ix_user_roadmap_step_completions_roadmap_step_id",
                schema: "roadmaps",
                table: "user_roadmap_step_completions",
                column: "roadmap_step_id");

            migrationBuilder.CreateIndex(
                name: "ix_user_roadmap_step_completions_user_id_roadmap_id",
                schema: "roadmaps",
                table: "user_roadmap_step_completions",
                columns: new[] { "user_id", "roadmap_id" });
        }
    }
}
