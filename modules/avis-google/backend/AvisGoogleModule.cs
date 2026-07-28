using Backend;
using Microsoft.EntityFrameworkCore;

namespace Modules.AvisGoogle;

public static class AvisGoogleModule
{
    public const string Name = "avis-google";

    public static void MapEndpoints(WebApplication app)
    {
        app.MapGet("/api/t/{clientSiteId:guid}/avis-google", async (Guid clientSiteId, AppDbContext db, ModuleRegistry registry) =>
        {
            if (!await registry.IsEnabledAsync(clientSiteId, Name)) return Results.NotFound();

            var settings = await db.GoogleReviewSettings.FirstOrDefaultAsync(s => s.ClientSiteId == clientSiteId);

            // Uniquement les avis choisis par le client (Selected) — pas tout ce qui a été
            // récupéré depuis le back-office, voir AvisGoogleAdminEndpoints.
            var reviews = await db.GoogleReviews
                .Where(r => r.ClientSiteId == clientSiteId && r.Selected)
                .OrderByDescending(r => r.GoogleTime)
                .ToListAsync();

            return Results.Ok(new
            {
                AverageRating = settings?.AverageRating,
                UserRatingsTotal = settings?.UserRatingsTotal,
                Reviews = reviews,
            });
        });
    }
}
