using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace Backend;

// Publication volontaire du contenu principal du site et du template/palette/logo — voir SiteSection.tsx,
// bouton "Rafraîchir le site". Tant que ce bouton n'a pas été cliqué, le site public
// (ContentEndpoints./content/published, TemplateEndpoints./template/published) continue de servir
// l'ancienne version, même si l'admin a déjà enregistré des modifications côté brouillon (live).
// Volontairement limité à SiteContent + ClientSite.TemplateId/PaletteId/CustomAccent/LogoPath : les
// modules avec leurs propres données (Catalogue, Galerie, Blog, RDV...) restent en temps réel, voir
// docs/02-architecture-modules.md.
public static class PublishEndpoints
{
    public static void MapEndpoints(WebApplication app)
    {
        app.MapPost("/api/t/{clientSiteId:guid}/admin/publish", async (Guid clientSiteId, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var site = await db.ClientSites.FindAsync(clientSiteId);
            var content = await db.SiteContents
                .Include(c => c.Offers)
                .FirstOrDefaultAsync(c => c.ClientSiteId == clientSiteId);
            if (site is null || content is null) return Results.NotFound();

            content.PublishedContentJson = JsonSerializer.Serialize(ContentEndpoints.ToResponse(content));
            site.PublishedTemplateId = site.TemplateId;
            site.PublishedPaletteId = site.PaletteId;
            site.PublishedCustomAccent = site.CustomAccent;
            site.PublishedLogoPath = site.LogoPath;
            site.PublishedAt = DateTime.UtcNow;

            await db.SaveChangesAsync();
            return Results.Ok(new { publishedAt = site.PublishedAt });
        });

        app.MapGet("/api/t/{clientSiteId:guid}/admin/publish-status", async (Guid clientSiteId, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var publishedAt = await db.ClientSites
                .Where(c => c.Id == clientSiteId)
                .Select(c => c.PublishedAt)
                .FirstOrDefaultAsync();

            return Results.Ok(new { publishedAt });
        });
    }
}
