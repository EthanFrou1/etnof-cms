using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddBlogPostCreatedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "BlogPosts",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            // Backfill : les articles créés avant cette migration (ex. le "Premier article" de démo
            // de la Phase 4) reprennent leur date de publication si connue, sinon l'instant présent.
            // Note : Npgsql traduit DateTime.MinValue en sentinelle '-infinity', pas en littéral
            // '0001-01-01' — comparer à cette valeur précisément (piège rencontré en appliquant
            // cette migration, voir docs/05-roadmap-poc.md).
            migrationBuilder.Sql(
                "UPDATE \"BlogPosts\" SET \"CreatedAt\" = COALESCE(\"PublishedAt\", NOW()) WHERE \"CreatedAt\" = '-infinity';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "BlogPosts");
        }
    }
}
