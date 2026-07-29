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
                .ToListAsync();

            return Results.Ok(products);
        });

        app.MapGet("/api/t/{clientSiteId:guid}/catalogue/products/{id:guid}", async (Guid clientSiteId, Guid id, AppDbContext db, ModuleRegistry registry) =>
        {
            if (!await registry.IsEnabledAsync(clientSiteId, Name)) return Results.NotFound();

            var product = await db.Products
                .Where(p => p.ClientSiteId == clientSiteId && p.Id == id)
                .Include(p => p.Images.OrderBy(i => i.SortOrder))
                .FirstOrDefaultAsync();

            return product is null ? Results.NotFound() : Results.Ok(product);
        });

        // Pas de paiement sur place : la seule façon de créer une commande est de payer via Stripe
        // (voir modules/stripe/backend/StripeModule.cs, qui crée la session de paiement puis la
        // commande à la confirmation du webhook). Décision d'Ethan, 2026-07-29.
    }
}
