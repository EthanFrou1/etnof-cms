using Backend;
using Microsoft.EntityFrameworkCore;

namespace Modules.Blog;

public static class BlogModule
{
    public const string Name = "blog";

    public static void MapEndpoints(WebApplication app)
    {
        // Comme ContactModule : la route reste mappée, le handler vérifie l'état courant du
        // module et renvoie 404 dynamiquement (toggle live depuis l'admin du tenant).
        app.MapGet("/api/t/{clientSiteId:guid}/blog", async (Guid clientSiteId, AppDbContext db, ModuleRegistry registry) =>
        {
            if (!await registry.IsEnabledAsync(clientSiteId, Name)) return Results.NotFound();

            var posts = await db.BlogPosts
                .Where(p => p.ClientSiteId == clientSiteId && p.PublishedAt != null)
                .OrderByDescending(p => p.PublishedAt)
                .Select(p => new { p.Id, p.Title, p.Slug, p.PublishedAt })
                .ToListAsync();

            return Results.Ok(posts);
        });

        app.MapGet("/api/t/{clientSiteId:guid}/blog/{slug}", async (Guid clientSiteId, string slug, AppDbContext db, ModuleRegistry registry) =>
        {
            if (!await registry.IsEnabledAsync(clientSiteId, Name)) return Results.NotFound();

            var post = await db.BlogPosts
                .FirstOrDefaultAsync(p => p.ClientSiteId == clientSiteId && p.Slug == slug && p.PublishedAt != null);
            return post is null ? Results.NotFound() : Results.Ok(post);
        });
    }
}
