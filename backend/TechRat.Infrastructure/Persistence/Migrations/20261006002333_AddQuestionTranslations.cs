using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TechRat.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddQuestionTranslations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "value",
                schema: "content",
                table: "content_translations",
                type: "character varying(4000)",
                maxLength: 4000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(1000)",
                oldMaxLength: 1000);

            migrationBuilder.AddColumn<bool>(
                name: "seed_managed",
                schema: "content",
                table: "content_translations",
                type: "boolean",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "seed_managed",
                schema: "content",
                table: "content_translations");

            migrationBuilder.AlterColumn<string>(
                name: "value",
                schema: "content",
                table: "content_translations",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(4000)",
                oldMaxLength: 4000);
        }
    }
}
