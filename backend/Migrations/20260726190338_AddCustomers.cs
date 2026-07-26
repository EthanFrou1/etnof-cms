using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Customers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ClientSiteId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: false),
                    Phone = table.Column<string>(type: "text", nullable: false),
                    Address = table.Column<string>(type: "text", nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Customers", x => x.Id);
                });

            // Nullable pour l'instant : backfillé ci-dessous avant d'être rendu obligatoire, pattern
            // déjà utilisé dans 20260726160436_AddMultiTenant.cs pour une migration de données.
            migrationBuilder.AddColumn<Guid>(
                name: "CustomerId",
                table: "Orders",
                type: "uuid",
                nullable: true);

            // Un Customer par couple (ClientSiteId, CustomerEmail) déjà présent dans Orders — les
            // commandes passées avant l'introduction de la fiche client se rattachent à un client
            // rétroactif au lieu de perdre leur lien. gen_random_uuid() est natif à partir de
            // Postgres 13 (docker-compose.yml utilise postgres:16-alpine), pas d'extension requise.
            migrationBuilder.Sql("""
                INSERT INTO "Customers" ("Id", "ClientSiteId", "Name", "Email", "Phone", "Address", "Notes", "CreatedAt")
                SELECT gen_random_uuid(), "ClientSiteId", MAX("CustomerName"), "CustomerEmail", '', '', '', MIN("CreatedAt")
                FROM "Orders"
                GROUP BY "ClientSiteId", "CustomerEmail";

                UPDATE "Orders" o
                SET "CustomerId" = c."Id"
                FROM "Customers" c
                WHERE o."ClientSiteId" = c."ClientSiteId" AND o."CustomerEmail" = c."Email";
                """);

            migrationBuilder.AlterColumn<Guid>(
                name: "CustomerId",
                table: "Orders",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Orders_CustomerId",
                table: "Orders",
                column: "CustomerId");

            migrationBuilder.AddForeignKey(
                name: "FK_Orders_Customers_CustomerId",
                table: "Orders",
                column: "CustomerId",
                principalTable: "Customers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Orders_Customers_CustomerId",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_Orders_CustomerId",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "CustomerId",
                table: "Orders");

            migrationBuilder.DropTable(
                name: "Customers");
        }
    }
}
