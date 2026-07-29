using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using Backend;
using Microsoft.EntityFrameworkCore;

namespace Modules.Blog;

// Endpoints admin du module Blog : le module n'avait jusqu'ici (Phase 4 du POC) qu'un affichage
// public en lecture seule, aucune interface pour créer/éditer un article — voir
// docs/05-roadmap-poc.md (2026-07-29).
public static class BlogAdminEndpoints
{
    public static void MapEndpoints(WebApplication app)
    {
        var group = app.MapGroup("/api/t/{clientSiteId:guid}/admin/blog/posts");

        group.MapGet("", async (Guid clientSiteId, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var posts = await db.BlogPosts
                .Where(p => p.ClientSiteId == clientSiteId)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            return Results.Ok(posts);
        });

        group.MapGet("/{id:guid}", async (Guid clientSiteId, Guid id, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var post = await db.BlogPosts.FirstOrDefaultAsync(p => p.ClientSiteId == clientSiteId && p.Id == id);
            return post is null ? Results.NotFound() : Results.Ok(post);
        });

        // Crée un brouillon vide immédiatement (pas de formulaire de création séparé) : le frontend
        // redirige aussitôt vers la fiche d'édition, même principe que "+ Ajouter un produit" mais
        // sans modal préalable puisqu'un article n'a pas de champs obligatoires à la création.
        group.MapPost("", async (Guid clientSiteId, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var post = new BlogPost
            {
                Id = Guid.NewGuid(),
                ClientSiteId = clientSiteId,
                Title = "Nouvel article",
                Slug = await UniqueSlugAsync(db, clientSiteId, "nouvel-article"),
                Content = "",
                PublishedAt = null,
                CreatedAt = DateTime.UtcNow,
            };

            db.BlogPosts.Add(post);
            await db.SaveChangesAsync();
            return Results.Ok(post);
        });

        group.MapPut("/{id:guid}", async (Guid clientSiteId, Guid id, BlogPostInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var post = await db.BlogPosts.FirstOrDefaultAsync(p => p.ClientSiteId == clientSiteId && p.Id == id);
            if (post is null) return Results.NotFound();

            var slug = string.IsNullOrWhiteSpace(input.Slug) ? Slugify(input.Title) : Slugify(input.Slug);
            if (slug != post.Slug)
            {
                slug = await UniqueSlugAsync(db, clientSiteId, slug, excludeId: post.Id);
            }

            post.Title = input.Title;
            post.Slug = slug;
            post.Content = input.Content;
            // Une republication ne rajeunit pas la date d'origine ; passer en brouillon efface la
            // date de publication (cohérent avec l'endpoint public : PublishedAt != null = publié).
            post.PublishedAt = input.Published ? (post.PublishedAt ?? DateTime.UtcNow) : null;

            await db.SaveChangesAsync();
            return Results.Ok(post);
        });

        group.MapDelete("/{id:guid}", async (Guid clientSiteId, Guid id, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var post = await db.BlogPosts.FirstOrDefaultAsync(p => p.ClientSiteId == clientSiteId && p.Id == id);
            if (post is null) return Results.NotFound();

            db.BlogPosts.Remove(post);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }

    private static async Task<string> UniqueSlugAsync(AppDbContext db, Guid clientSiteId, string baseSlug, Guid? excludeId = null)
    {
        var slug = baseSlug;
        var suffix = 2;
        while (await db.BlogPosts.AnyAsync(p => p.ClientSiteId == clientSiteId && p.Slug == slug && p.Id != (excludeId ?? Guid.Empty)))
        {
            slug = $"{baseSlug}-{suffix}";
            suffix++;
        }
        return slug;
    }

    // Retire les accents, ne garde que lettres/chiffres, remplace le reste par des tirets simples —
    // même esprit que les autres champs "slug-like" du projet (ex. ProductId côté fichiers uploadés),
    // sans dépendance externe.
    private static string Slugify(string input)
    {
        var normalized = input.Normalize(NormalizationForm.FormD);
        var withoutAccents = new string(normalized.Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark).ToArray());
        var lower = withoutAccents.ToLowerInvariant();
        var hyphenated = Regex.Replace(lower, "[^a-z0-9]+", "-").Trim('-');
        return string.IsNullOrEmpty(hyphenated) ? "article" : hyphenated;
    }
}

public record BlogPostInput(string Title, string Slug, string Content, bool Published);
