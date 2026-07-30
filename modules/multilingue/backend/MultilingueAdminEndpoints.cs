using Backend;
using Microsoft.EntityFrameworkCore;

namespace Modules.Multilingue;

// CRUD des traductions (site + offres + articles de blog) — pas de vérification ModuleRegistry ici
// (même choix que BlogAdminEndpoints.cs) : le gate "module autorisé" se fait côté frontend
// (AdminPage.tsx), ces endpoints ne font que lire/écrire ContentTranslation pour ce tenant.
public static class MultilingueAdminEndpoints
{
    public static void MapEndpoints(WebApplication app)
    {
        var group = app.MapGroup("/api/t/{clientSiteId:guid}/admin/multilingue");

        // Traduction automatique (DeepL) — préremplit le brouillon côté admin, ne sauvegarde jamais
        // tout seul (voir DeepLTranslator.cs). Un seul appel pour plusieurs champs à la fois (ex.
        // nom + description) pour économiser des requêtes.
        group.MapPost("/translate", async (Guid clientSiteId, TranslateInput input, HttpRequest req, IConfiguration config, AppDbContext db, IHttpClientFactory httpFactory) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();
            if (!MultilingueModule.IsSupportedLocale(input.TargetLocale)) return Results.BadRequest("Locale non supportée.");

            var apiKey = config["DeepL:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                return Results.Json(new { error = "Traduction automatique indisponible (clé DeepL non configurée)." }, statusCode: 502);
            }

            var (translated, error) = await DeepLTranslator.TranslateManyAsync(httpFactory, apiKey, input.Texts, input.TargetLocale);
            if (error is not null) return Results.Json(new { error }, statusCode: 502);

            return Results.Ok(new { translated });
        });

        group.MapGet("/site", async (Guid clientSiteId, string locale, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();
            if (!MultilingueModule.IsSupportedLocale(locale)) return Results.BadRequest("Locale non supportée.");

            var content = await db.SiteContents.FirstOrDefaultAsync(c => c.ClientSiteId == clientSiteId);
            if (content is null) return Results.NotFound();

            var translated = await MultilingueModule.GetFieldsAsync(db, clientSiteId, "site", null, locale);

            return Results.Ok(new
            {
                original = new { siteName = content.SiteName, description = content.Description },
                translated = new
                {
                    siteName = translated.GetValueOrDefault("siteName", ""),
                    description = translated.GetValueOrDefault("description", ""),
                },
            });
        });

        group.MapPut("/site", async (Guid clientSiteId, SiteTranslationInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();
            if (!MultilingueModule.IsSupportedLocale(input.Locale)) return Results.BadRequest("Locale non supportée.");

            await MultilingueModule.UpsertAsync(db, clientSiteId, "site", null, input.Locale, "siteName", input.SiteName);
            await MultilingueModule.UpsertAsync(db, clientSiteId, "site", null, input.Locale, "description", input.Description);
            await db.SaveChangesAsync();

            return Results.Ok();
        });

        group.MapGet("/offers", async (Guid clientSiteId, string locale, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();
            if (!MultilingueModule.IsSupportedLocale(locale)) return Results.BadRequest("Locale non supportée.");

            var content = await db.SiteContents.Include(c => c.Offers).FirstOrDefaultAsync(c => c.ClientSiteId == clientSiteId);
            if (content is null) return Results.NotFound();

            var translations = await MultilingueModule.GetFieldsForManyAsync(db, clientSiteId, "offer", locale);

            var result = content.Offers.Select(o => new
            {
                offerId = o.Id,
                original = new { title = o.Title, description = o.Description },
                translated = new
                {
                    title = translations.GetValueOrDefault(o.Id)?.GetValueOrDefault("title", "") ?? "",
                    description = translations.GetValueOrDefault(o.Id)?.GetValueOrDefault("description", "") ?? "",
                },
            });

            return Results.Ok(result);
        });

        group.MapPut("/offers/{offerId:guid}", async (Guid clientSiteId, Guid offerId, OfferTranslationInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();
            if (!MultilingueModule.IsSupportedLocale(input.Locale)) return Results.BadRequest("Locale non supportée.");

            var offer = await db.Offers
                .Join(db.SiteContents.Where(c => c.ClientSiteId == clientSiteId), o => o.SiteContentId, c => c.Id, (o, c) => o)
                .FirstOrDefaultAsync(o => o.Id == offerId);
            if (offer is null) return Results.NotFound();

            await MultilingueModule.UpsertAsync(db, clientSiteId, "offer", offerId, input.Locale, "title", input.Title);
            await MultilingueModule.UpsertAsync(db, clientSiteId, "offer", offerId, input.Locale, "description", input.Description);
            await db.SaveChangesAsync();

            return Results.Ok();
        });

        group.MapGet("/blog", async (Guid clientSiteId, string locale, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();
            if (!MultilingueModule.IsSupportedLocale(locale)) return Results.BadRequest("Locale non supportée.");

            var posts = await db.BlogPosts
                .Where(p => p.ClientSiteId == clientSiteId)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            var translations = await MultilingueModule.GetFieldsForManyAsync(db, clientSiteId, "blog-post", locale);

            var result = posts.Select(p => new
            {
                postId = p.Id,
                original = new { title = p.Title, content = p.Content },
                translated = new
                {
                    title = translations.GetValueOrDefault(p.Id)?.GetValueOrDefault("title", "") ?? "",
                    content = translations.GetValueOrDefault(p.Id)?.GetValueOrDefault("content", "") ?? "",
                },
            });

            return Results.Ok(result);
        });

        group.MapPut("/blog/{postId:guid}", async (Guid clientSiteId, Guid postId, BlogTranslationInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();
            if (!MultilingueModule.IsSupportedLocale(input.Locale)) return Results.BadRequest("Locale non supportée.");

            var post = await db.BlogPosts.FirstOrDefaultAsync(p => p.Id == postId && p.ClientSiteId == clientSiteId);
            if (post is null) return Results.NotFound();

            await MultilingueModule.UpsertAsync(db, clientSiteId, "blog-post", postId, input.Locale, "title", input.Title);
            await MultilingueModule.UpsertAsync(db, clientSiteId, "blog-post", postId, input.Locale, "content", input.Content);
            await db.SaveChangesAsync();

            return Results.Ok();
        });
    }
}

public record SiteTranslationInput(string Locale, string SiteName, string Description);
public record OfferTranslationInput(string Locale, string Title, string Description);
public record BlogTranslationInput(string Locale, string Title, string Content);
public record TranslateInput(List<string> Texts, string TargetLocale);
