using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TechRat.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddUserShowOnLeaderboard : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "show_on_leaderboard",
                schema: "learning",
                table: "users",
                type: "boolean",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "show_on_leaderboard",
                schema: "learning",
                table: "users");
        }
    }
}
