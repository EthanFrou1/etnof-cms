using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddEstablishmentInfo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Address",
                table: "SiteContents",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "EstablishmentName",
                table: "SiteContents",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "EstablishmentType",
                table: "SiteContents",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Phone",
                table: "SiteContents",
                type: "text",
                nullable: false,
                defaultValue: "");

            // Reprend l'adresse déjà saisie dans le champ maps.address de ModulesConfigJson (avant ce
            // changement, l'adresse vivait dans la config du module Maps) — sans ça, un tenant qui
            // avait déjà configuré son adresse la perdrait sur sa carte publique après la migration.
            migrationBuilder.Sql("""
                UPDATE "SiteContents" sc
                SET "Address" = cs."ModulesConfigJson"::jsonb -> 'maps' ->> 'address'
                FROM "ClientSites" cs
                WHERE sc."ClientSiteId" = cs."Id"
                  AND cs."ModulesConfigJson"::jsonb -> 'maps' ->> 'address' IS NOT NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Address",
                table: "SiteContents");

            migrationBuilder.DropColumn(
                name: "EstablishmentName",
                table: "SiteContents");

            migrationBuilder.DropColumn(
                name: "EstablishmentType",
                table: "SiteContents");

            migrationBuilder.DropColumn(
                name: "Phone",
                table: "SiteContents");
        }
    }
}
