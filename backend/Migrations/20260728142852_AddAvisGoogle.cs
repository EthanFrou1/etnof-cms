using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddAvisGoogle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "GoogleReviews",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ClientSiteId = table.Column<Guid>(type: "uuid", nullable: false),
                    GoogleTime = table.Column<long>(type: "bigint", nullable: false),
                    AuthorName = table.Column<string>(type: "text", nullable: false),
                    ProfilePhotoUrl = table.Column<string>(type: "text", nullable: true),
                    Rating = table.Column<int>(type: "integer", nullable: false),
                    Text = table.Column<string>(type: "text", nullable: false),
                    RelativeTimeDescription = table.Column<string>(type: "text", nullable: false),
                    Selected = table.Column<bool>(type: "boolean", nullable: false),
                    FetchedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GoogleReviews", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "GoogleReviewSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ClientSiteId = table.Column<Guid>(type: "uuid", nullable: false),
                    PlaceId = table.Column<string>(type: "text", nullable: false),
                    PlaceName = table.Column<string>(type: "text", nullable: false),
                    AverageRating = table.Column<double>(type: "double precision", nullable: true),
                    UserRatingsTotal = table.Column<int>(type: "integer", nullable: true),
                    LastFetchedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GoogleReviewSettings", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GoogleReviews");

            migrationBuilder.DropTable(
                name: "GoogleReviewSettings");
        }
    }
}
