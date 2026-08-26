using Backend;
using Microsoft.EntityFrameworkCore;

namespace Modules.Catalogue;

public static class CatalogueModule
{
    public const string Name = "catalogue";

    public static void MapEndpoints(WebApplication app)
    {
        app.MapGet("/api/t/{clientSiteId:guid}/catalogue/products", async (Guid clientSiteId, AppDbContext db, ModuleRegistry registry) =>
        {
            if (!await registry.IsEnabledAsync(clientSiteId, Name)) return Results.NotFound();

            var products = await db.Products
                .Where(p => p.ClientSiteId == clientSiteId)
                .OrderByDescending(p => p.CreatedAt)
                .Include(p => p.Images.OrderBy(i => i.SortOrder))
                .Include(p => p.Sizes.OrderBy(s => s.SortOrder))
                .ToListAsync();

            // Agrégée en une seule requête plutôt que par produit (pas de N+1) — seuls les avis
            // approuvés (Selected) comptent dans la note affichée publiquement, voir ProductReview.cs.
            var ratings = await db.ProductReviews
                .Where(r => r.ClientSiteId == clientSiteId && r.Selected)
                .GroupBy(r => r.ProductId)
                .Select(g => new { ProductId = g.Key, Average = g.Average(r => r.Rating), Count = g.Count() })
                .ToDictionaryAsync(g => g.ProductId);

            return Results.Ok(products.Select(p =>
            {
                ratings.TryGetValue(p.Id, out var rating);
                return new
                {
                    p.Id,
                    p.Name,
                    p.Description,
                    p.Price,
                    p.Stock,
                    p.Images,
                    p.Sizes,
                    p.CollectionId,
                    p.Highlighted,
                    AverageRating = rating is null ? (double?)null : rating.Average,
                    ReviewCount = rating?.Count ?? 0,
                };
            }));
        });

        // Utilisé uniquement par la page boutique du template Charis pour ses chips de filtre
        // (Hestia/Helios n'ont pas de filtre par collection, voir docs/10-templates.md).
        app.MapGet("/api/t/{clientSiteId:guid}/catalogue/collections", async (Guid clientSiteId, AppDbContext db, ModuleRegistry registry) =>
        {
            if (!await registry.IsEnabledAsync(clientSiteId, Name)) return Results.NotFound();

            var collections = await db.Collections
                .Where(c => c.ClientSiteId == clientSiteId)
                .OrderBy(c => c.SortOrder)
                .Select(c => new { c.Id, c.Name })
                .ToListAsync();

            return Results.Ok(collections);
        });

        app.MapGet("/api/t/{clientSiteId:guid}/catalogue/products/{id:guid}", async (Guid clientSiteId, Guid id, AppDbContext db, ModuleRegistry registry) =>
        {
            if (!await registry.IsEnabledAsync(clientSiteId, Name)) return Results.NotFound();

            var product = await db.Products
                .Where(p => p.ClientSiteId == clientSiteId && p.Id == id)
                .Include(p => p.Images.OrderBy(i => i.SortOrder))
                .Include(p => p.Sizes.OrderBy(s => s.SortOrder))
                .FirstOrDefaultAsync();

            return product is null ? Results.NotFound() : Results.Ok(product);
        });

        // Pas de paiement sur place : la seule façon de créer une commande est de payer via Stripe
        // (voir modules/stripe/backend/StripeModule.cs, qui crée la session de paiement puis la
        // commande à la confirmation du webhook). Décision d'Ethan, 2026-07-29.

        // Avis produits — seuls les avis approuvés (Selected) sont visibles publiquement, voir
        // ProductReview.cs. Pas de vérification d'achat en V1 (rester simple).
        app.MapGet("/api/t/{clientSiteId:guid}/catalogue/products/{productId:guid}/reviews", async (
            Guid clientSiteId, Guid productId, AppDbContext db, ModuleRegistry registry) =>
        {
            if (!await registry.IsEnabledAsync(clientSiteId, Name)) return Results.NotFound();

            var reviews = await db.ProductReviews
                .Where(r => r.ClientSiteId == clientSiteId && r.ProductId == productId && r.Selected)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new { r.Id, r.AuthorName, r.Rating, r.Comment, r.CreatedAt })
                .ToListAsync();

            return Results.Ok(reviews);
        });

        // Soumission publique — enregistrée avec Selected=false (en attente de modération), jamais
        // visible tant que le client ne l'a pas approuvée depuis son admin.
        app.MapPost("/api/t/{clientSiteId:guid}/catalogue/products/{productId:guid}/reviews", async (
            Guid clientSiteId, Guid productId, ProductReviewInput input, AppDbContext db, ModuleRegistry registry) =>
        {
            if (!await registry.IsEnabledAsync(clientSiteId, Name)) return Results.NotFound();

            var productExists = await db.Products.AnyAsync(p => p.ClientSiteId == clientSiteId && p.Id == productId);
            if (!productExists) return Results.NotFound();

            if (string.IsNullOrWhiteSpace(input.AuthorName) || string.IsNullOrWhiteSpace(input.Comment))
            {
                return Results.BadRequest(new { error = "Nom et commentaire requis." });
            }
            if (input.Rating < 1 || input.Rating > 5)
            {
                return Results.BadRequest(new { error = "La note doit être entre 1 et 5." });
            }

            var review = new ProductReview
            {
                Id = Guid.NewGuid(),
                ClientSiteId = clientSiteId,
                ProductId = productId,
                AuthorName = input.AuthorName.Trim(),
                Rating = input.Rating,
                Comment = input.Comment.Trim(),
                Selected = false,
                CreatedAt = DateTime.UtcNow,
            };
            db.ProductReviews.Add(review);
            await db.SaveChangesAsync();

            return Results.Created($"/api/t/{clientSiteId}/catalogue/products/{productId}/reviews/{review.Id}", new { review.Id });
        });
    }
}

public record ProductReviewInput(string AuthorName, int Rating, string Comment);
