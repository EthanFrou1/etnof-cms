using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddContentPublishSnapshot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PublishedContentJson",
                table: "SiteContents",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PublishedAt",
                table: "ClientSites",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PublishedCustomAccent",
                table: "ClientSites",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PublishedPaletteId",
                table: "ClientSites",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PublishedTemplateId",
                table: "ClientSites",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PublishedContentJson",
                table: "SiteContents");

            migrationBuilder.DropColumn(
                name: "PublishedAt",
                table: "ClientSites");

            migrationBuilder.DropColumn(
                name: "PublishedCustomAccent",
                table: "ClientSites");

            migrationBuilder.DropColumn(
                name: "PublishedPaletteId",
                table: "ClientSites");

            migrationBuilder.DropColumn(
                name: "PublishedTemplateId",
                table: "ClientSites");
        }
    }
}
