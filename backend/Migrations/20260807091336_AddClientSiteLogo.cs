using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddClientSiteLogo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "LogoPath",
                table: "ClientSites",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PublishedLogoPath",
                table: "ClientSites",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LogoPath",
                table: "ClientSites");

            migrationBuilder.DropColumn(
                name: "PublishedLogoPath",
                table: "ClientSites");
        }
    }
}
