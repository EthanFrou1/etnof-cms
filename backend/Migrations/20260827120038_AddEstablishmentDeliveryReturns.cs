using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddEstablishmentDeliveryReturns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // defaultValue non vide (contrairement au pattern habituel "") : backfill volontaire des
            // tenants existants avec le texte générique déjà affiché à tous avant que ces champs
            // n'existent (voir SiteContent.cs) — personne ne doit arriver sur un champ vide.
            migrationBuilder.AddColumn<string>(
                name: "DeliveryContent",
                table: "SiteContents",
                type: "text",
                nullable: false,
                defaultValue: "Expédition sous 24 à 48h. Livraison estimée en 3 à 5 jours ouvrés.");

            migrationBuilder.AddColumn<string>(
                name: "ReturnsContent",
                table: "SiteContents",
                type: "text",
                nullable: false,
                defaultValue: "Retours gratuits sous 30 jours, article non porté et dans son emballage d'origine.");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DeliveryContent",
                table: "SiteContents");

            migrationBuilder.DropColumn(
                name: "ReturnsContent",
                table: "SiteContents");
        }
    }
}
