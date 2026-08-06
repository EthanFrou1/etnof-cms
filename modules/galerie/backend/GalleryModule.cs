using Backend;
using Microsoft.EntityFrameworkCore;

namespace Modules.Galerie;

// Endpoint public — voir modules/rdv/backend/RdvModule.cs pour le même pattern (registry.IsEnabledAsync
// avant toute réponse, jamais de fuite de données si le module n'est pas authorized+enabled).
public static class GalleryModule
{
    public const string Name = "galerie";

    public static void MapEndpoints(WebApplication app)
    {
        app.MapGet("/api/t/{clientSiteId:guid}/galerie/images", async (Guid clientSiteId, AppDbContext db, ModuleRegistry registry) =>
        {
            if (!await registry.IsEnabledAsync(clientSiteId, Name)) return Results.NotFound();

            var images = await db.GalleryImages
                .Where(i => i.ClientSiteId == clientSiteId)
                .OrderBy(i => i.SortOrder)
                .ToListAsync();

            return Results.Ok(images);
        });
    }
}
