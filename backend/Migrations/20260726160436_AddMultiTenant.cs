using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddMultiTenant : Migration
    {
        // Id fixe et connu du "tenant historique" : le site qui existait déjà avant le passage en
        // multi-tenant (2026-07-26) récupère tout le contenu/messages/articles déjà en base.
        private const string HistoricTenantId = "11111111-1111-1111-1111-111111111111";

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Modules",
                table: "ClientSites");

            migrationBuilder.AddColumn<string>(
                name: "PasswordHash",
                table: "ClientSites",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ModulesConfigJson",
                table: "ClientSites",
                type: "text",
                nullable: false,
                defaultValue: "{}");

            // Crée le tenant historique avec l'état exact de l'ancien site.config.json et le mot de
            // passe admin local existant (admin123, déjà hashé — voir backend/appsettings.Development.json).
            migrationBuilder.Sql("""
                INSERT INTO "ClientSites" ("Id", "Name", "SiteType", "Description", "Url", "Status", "PasswordHash", "ModulesConfigJson", "CreatedAt")
                VALUES (
                    '11111111-1111-1111-1111-111111111111',
                    'Site historique',
                    '',
                    'Site migré automatiquement lors du passage en multi-tenant (2026-07-26).',
                    '',
                    'Livré',
                    '100000.MIAKyWYczdOaZ54Mg3nFdg==.lbrzfHfldgqRoPYPq3SpFk9lLWVKFZUhYzIMrISQyqw=',
                    '{"contact":{"enabled":true},"maps":{"enabled":true,"address":"12 rue de la Paix, 66000 Perpignan","apiKey":""},"blog":{"enabled":true}}',
                    now()
                );
                """);

            migrationBuilder.AddColumn<Guid>(
                name: "ClientSiteId",
                table: "SiteContents",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid(HistoricTenantId));

            migrationBuilder.AddColumn<Guid>(
                name: "ClientSiteId",
                table: "ContactMessages",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid(HistoricTenantId));

            migrationBuilder.AddColumn<Guid>(
                name: "ClientSiteId",
                table: "BlogPosts",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid(HistoricTenantId));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ClientSiteId",
                table: "SiteContents");

            migrationBuilder.DropColumn(
                name: "ClientSiteId",
                table: "ContactMessages");

            migrationBuilder.DropColumn(
                name: "ClientSiteId",
                table: "BlogPosts");

            migrationBuilder.Sql($"""DELETE FROM "ClientSites" WHERE "Id" = '{HistoricTenantId}';""");

            migrationBuilder.DropColumn(
                name: "ModulesConfigJson",
                table: "ClientSites");

            migrationBuilder.DropColumn(
                name: "PasswordHash",
                table: "ClientSites");

            migrationBuilder.AddColumn<List<string>>(
                name: "Modules",
                table: "ClientSites",
                type: "text[]",
                nullable: false);
        }
    }
}
