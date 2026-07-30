using Microsoft.EntityFrameworkCore;

namespace Backend;

// CRUD des formules de base — voir PackageOffer.cs. Réservé à Ethan (AdminAuth).
public static class PackageOfferEndpoints
{
    public static void MapEndpoints(WebApplication app)
    {
        app.MapGet("/api/admin/package-offers", async (HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();

            if (!await db.PackageOffers.AnyAsync())
            {
                // Seed une seule fois, si la table est entièrement vide — jamais re-déclenché après
                // une suppression manuelle (voir docs/13-facturation-devis.md).
                db.PackageOffers.AddRange(
                    new PackageOffer { Id = Guid.NewGuid(), Name = "Essentiel", Price = "690€", SortOrder = 0 },
                    new PackageOffer { Id = Guid.NewGuid(), Name = "Business", Price = "1090€", SortOrder = 1 },
                    new PackageOffer { Id = Guid.NewGuid(), Name = "Sur mesure", Price = "1990€", SortOrder = 2 }
                );
                await db.SaveChangesAsync();
            }

            var offers = await db.PackageOffers.OrderBy(o => o.SortOrder).ToListAsync();
            return Results.Ok(offers);
        });

        app.MapPost("/api/admin/package-offers", async (PackageOfferInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();

            var maxSortOrder = await db.PackageOffers.Select(o => (int?)o.SortOrder).MaxAsync() ?? -1;
            var offer = new PackageOffer { Id = Guid.NewGuid(), Name = input.Name, Price = input.Price, SortOrder = maxSortOrder + 1 };

            db.PackageOffers.Add(offer);
            await db.SaveChangesAsync();
            return Results.Created($"/api/admin/package-offers/{offer.Id}", offer);
        });

        app.MapPut("/api/admin/package-offers/{id:guid}", async (Guid id, PackageOfferInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();

            var offer = await db.PackageOffers.FindAsync(id);
            if (offer is null) return Results.NotFound();

            offer.Name = input.Name;
            offer.Price = input.Price;
            await db.SaveChangesAsync();
            return Results.Ok(offer);
        });

        app.MapDelete("/api/admin/package-offers/{id:guid}", async (Guid id, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();

            var offer = await db.PackageOffers.FindAsync(id);
            if (offer is null) return Results.NotFound();

            db.PackageOffers.Remove(offer);
            await db.SaveChangesAsync();
            return Results.Ok();
        });
    }
}

public record PackageOfferInput(string Name, string Price);
