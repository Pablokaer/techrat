using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TechRat.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ConfirmExistingEmails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Sign-in now needs a confirmed email (ADR-0031). Accounts that existed before never had to confirm, so they are marked
            // confirmed: otherwise everybody already using the platform would be locked out when this deploys.
            migrationBuilder.Sql("UPDATE identity.users SET email_confirmed = TRUE WHERE email_confirmed = FALSE;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Nothing to undo: which accounts were unconfirmed before is not recorded, and a confirmed flag harms nobody.
        }
    }
}
