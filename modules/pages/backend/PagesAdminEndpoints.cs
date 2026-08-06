using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using Backend;
using Microsoft.EntityFrameworkCore;

namespace Modules.Pages;

// Endpoints admin — mêmes patterns que modules/blog/backend/BlogAdminEndpoints.cs (brouillon vide
// créé immédiatement, slug généré/rendu unique par tenant), plus un endpoint /move pour l'ordre
// choisi par le client dans le menu déroulant (premier réordonnancement du projet — voir
// docs/12-plan-modules-restants.md : par simples boutons monter/descendre, pas de glisser-déposer,
// pour ne pas ajouter de dépendance externe).
public static class PagesAdminEndpoints
{
    public static void MapEndpoints(WebApplication app)
    {
        var group = app.MapGroup("/api/t/{clientSiteId:guid}/admin/pages");

        group.MapGet("", async (Guid clientSiteId, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var pages = await db.CustomPages
                .Where(p => p.ClientSiteId == clientSiteId)
                .OrderBy(p => p.SortOrder)
                .ToListAsync();

            return Results.Ok(pages);
        });

        group.MapGet("/{id:guid}", async (Guid clientSiteId, Guid id, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var page = await db.CustomPages.FirstOrDefaultAsync(p => p.ClientSiteId == clientSiteId && p.Id == id);
            return page is null ? Results.NotFound() : Results.Ok(page);
        });

        // Brouillon vide créé immédiatement, pas de formulaire de création séparé — même principe
        // que "Nouvel article" (BlogAdminEndpoints.cs).
        group.MapPost("", async (Guid clientSiteId, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var nextSortOrder = (await db.CustomPages
                .Where(p => p.ClientSiteId == clientSiteId)
                .Select(p => (int?)p.SortOrder)
                .MaxAsync() ?? -1) + 1;

            var page = new CustomPage
            {
                Id = Guid.NewGuid(),
                ClientSiteId = clientSiteId,
                Title = "Nouvelle page",
                Slug = await UniqueSlugAsync(db, clientSiteId, "nouvelle-page"),
                Content = "",
                SortOrder = nextSortOrder,
                PublishedAt = null,
                CreatedAt = DateTime.UtcNow,
            };

            db.CustomPages.Add(page);
            await db.SaveChangesAsync();
            return Results.Ok(page);
        });

        group.MapPut("/{id:guid}", async (Guid clientSiteId, Guid id, CustomPageInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var page = await db.CustomPages.FirstOrDefaultAsync(p => p.ClientSiteId == clientSiteId && p.Id == id);
            if (page is null) return Results.NotFound();

            var slug = string.IsNullOrWhiteSpace(input.Slug) ? Slugify(input.Title) : Slugify(input.Slug);
            if (slug != page.Slug)
            {
                slug = await UniqueSlugAsync(db, clientSiteId, slug, excludeId: page.Id);
            }

            page.Title = input.Title;
            page.Slug = slug;
            page.Content = input.Content;
            // Une republication ne rajeunit pas la date d'origine ; repasser en brouillon efface la
            // date de publication (cohérent avec l'endpoint public : PublishedAt != null = publié).
            page.PublishedAt = input.Published ? (page.PublishedAt ?? DateTime.UtcNow) : null;

            await db.SaveChangesAsync();
            return Results.Ok(page);
        });

        group.MapDelete("/{id:guid}", async (Guid clientSiteId, Guid id, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var page = await db.CustomPages.FirstOrDefaultAsync(p => p.ClientSiteId == clientSiteId && p.Id == id);
            if (page is null) return Results.NotFound();

            db.CustomPages.Remove(page);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // Échange le SortOrder avec le voisin immédiat (direction "up"/"down") — suffisant pour
        // réordonner une liste courte de pages, pas besoin d'un vrai algorithme de tri par lot.
        group.MapPost("/{id:guid}/move", async (Guid clientSiteId, Guid id, MovePageInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var pages = await db.CustomPages
                .Where(p => p.ClientSiteId == clientSiteId)
                .OrderBy(p => p.SortOrder)
                .ToListAsync();

            var index = pages.FindIndex(p => p.Id == id);
            if (index < 0) return Results.NotFound();

            var neighborIndex = input.Direction == "up" ? index - 1 : index + 1;
            if (neighborIndex < 0 || neighborIndex >= pages.Count) return Results.Ok(pages);

            (pages[index].SortOrder, pages[neighborIndex].SortOrder) = (pages[neighborIndex].SortOrder, pages[index].SortOrder);
            await db.SaveChangesAsync();

            return Results.Ok(pages.OrderBy(p => p.SortOrder));
        });
    }

    private static async Task<string> UniqueSlugAsync(AppDbContext db, Guid clientSiteId, string baseSlug, Guid? excludeId = null)
    {
        var slug = baseSlug;
        var suffix = 2;
        while (await db.CustomPages.AnyAsync(p => p.ClientSiteId == clientSiteId && p.Slug == slug && p.Id != (excludeId ?? Guid.Empty)))
        {
            slug = $"{baseSlug}-{suffix}";
            suffix++;
        }
        return slug;
    }

    // Identique à BlogAdminEndpoints.Slugify — retire les accents, ne garde que lettres/chiffres,
    // remplace le reste par des tirets simples, sans dépendance externe.
    private static string Slugify(string input)
    {
        var normalized = input.Normalize(NormalizationForm.FormD);
        var withoutAccents = new string(normalized.Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark).ToArray());
        var lower = withoutAccents.ToLowerInvariant();
        var hyphenated = Regex.Replace(lower, "[^a-z0-9]+", "-").Trim('-');
        return string.IsNullOrEmpty(hyphenated) ? "page" : hyphenated;
    }
}

public record CustomPageInput(string Title, string Slug, string Content, bool Published);
public record MovePageInput(string Direction);
