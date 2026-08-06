using Backend;
using Microsoft.EntityFrameworkCore;

namespace Modules.Pages;

// Endpoints publics — pas de traduction multilingue pour l'instant (le module Multilingue ne couvre
// que le nom/description du site, les offres et le blog, voir docs/12-plan-modules-restants.md ;
// étendre à CustomPage serait un chantier à part).
public static class PagesModule
{
    public const string Name = "pages";

    public static void MapEndpoints(WebApplication app)
    {
        // Liste légère (Id/Title/Slug) pour le menu déroulant du header — voir
        // modules/pages/frontend/CustomPagesNav.tsx.
        app.MapGet("/api/t/{clientSiteId:guid}/pages", async (Guid clientSiteId, AppDbContext db, ModuleRegistry registry) =>
        {
            if (!await registry.IsEnabledAsync(clientSiteId, Name)) return Results.NotFound();

            var pages = await db.CustomPages
                .Where(p => p.ClientSiteId == clientSiteId && p.PublishedAt != null)
                .OrderBy(p => p.SortOrder)
                .Select(p => new { p.Id, p.Title, p.Slug })
                .ToListAsync();

            return Results.Ok(pages);
        });

        app.MapGet("/api/t/{clientSiteId:guid}/pages/{slug}", async (Guid clientSiteId, string slug, AppDbContext db, ModuleRegistry registry) =>
        {
            if (!await registry.IsEnabledAsync(clientSiteId, Name)) return Results.NotFound();

            var page = await db.CustomPages
                .FirstOrDefaultAsync(p => p.ClientSiteId == clientSiteId && p.Slug == slug && p.PublishedAt != null);
            if (page is null) return Results.NotFound();

            return Results.Ok(new { page.Id, page.Title, page.Slug, page.Content });
        });
    }
}
