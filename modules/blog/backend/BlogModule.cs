using Backend;
using Microsoft.EntityFrameworkCore;
using Modules.Multilingue;

namespace Modules.Blog;

public static class BlogModule
{
    public const string Name = "blog";

    public static void MapEndpoints(WebApplication app)
    {
        // Comme ContactModule : la route reste mappée, le handler vérifie l'état courant du
        // module et renvoie 404 dynamiquement (toggle live depuis l'admin du tenant). `locale`
        // optionnel (module Multilingue) — ignoré si Multilingue n'est pas actif pour ce tenant ou
        // si la locale n'est pas supportée.
        app.MapGet("/api/t/{clientSiteId:guid}/blog", async (Guid clientSiteId, string? locale, AppDbContext db, ModuleRegistry registry) =>
        {
            if (!await registry.IsEnabledAsync(clientSiteId, Name)) return Results.NotFound();

            var posts = await db.BlogPosts
                .Where(p => p.ClientSiteId == clientSiteId && p.PublishedAt != null)
                .OrderByDescending(p => p.PublishedAt)
                .Select(p => new { p.Id, p.Title, p.Slug, p.PublishedAt })
                .ToListAsync();

            if (MultilingueModule.IsSupportedLocale(locale) && await registry.IsEnabledAsync(clientSiteId, MultilingueModule.Name))
            {
                var translations = await MultilingueModule.GetFieldsForManyAsync(db, clientSiteId, "blog-post", locale!);
                posts = posts
                    .Select(p =>
                    {
                        var fields = translations.GetValueOrDefault(p.Id) ?? new Dictionary<string, string>();
                        return new { p.Id, Title = MultilingueModule.Merge(p.Title, fields, "title"), p.Slug, p.PublishedAt };
                    })
                    .ToList();
            }

            return Results.Ok(posts);
        });

        app.MapGet("/api/t/{clientSiteId:guid}/blog/{slug}", async (Guid clientSiteId, string slug, string? locale, AppDbContext db, ModuleRegistry registry) =>
        {
            if (!await registry.IsEnabledAsync(clientSiteId, Name)) return Results.NotFound();

            var post = await db.BlogPosts
                .FirstOrDefaultAsync(p => p.ClientSiteId == clientSiteId && p.Slug == slug && p.PublishedAt != null);
            if (post is null) return Results.NotFound();

            if (MultilingueModule.IsSupportedLocale(locale) && await registry.IsEnabledAsync(clientSiteId, MultilingueModule.Name))
            {
                var fields = await MultilingueModule.GetFieldsAsync(db, clientSiteId, "blog-post", post.Id, locale!);
                return Results.Ok(new
                {
                    post.Id,
                    Title = MultilingueModule.Merge(post.Title, fields, "title"),
                    post.Slug,
                    Content = MultilingueModule.Merge(post.Content, fields, "content"),
                    post.PublishedAt,
                });
            }

            return Results.Ok(post);
        });
    }
}
