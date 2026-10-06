using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TechRat.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddRoadmapJuniorRank : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "junior_rank",
                schema: "roadmaps",
                table: "roadmaps",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "junior_rank",
                schema: "roadmaps",
                table: "roadmaps");
        }
    }
}
