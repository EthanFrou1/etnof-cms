using System.Text.Json;
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
                // une suppression manuelle (voir docs/13-facturation-devis.md). Reprend le contenu du
                // site public (website-etnof-web.vercel.app/tarifs.html).
                db.PackageOffers.AddRange(
                    new PackageOffer
                    {
                        Id = Guid.NewGuid(),
                        Name = "Essentiel",
                        Price = "690€",
                        Description = "Pour les indépendants, artisans et petites entreprises qui veulent une présence professionnelle.",
                        FeaturesJson = JsonSerializer.Serialize(new[]
                        {
                            "Landing page ou site jusqu'à 5 pages",
                            "Design moderne et responsive",
                            "Formulaire de contact",
                            "SEO technique de base",
                            "Configuration du nom de domaine",
                            "Configuration de l'hébergement",
                            "Livraison rapide",
                        }),
                        Highlighted = false,
                        SortOrder = 0,
                    },
                    new PackageOffer
                    {
                        Id = Guid.NewGuid(),
                        Name = "Business",
                        Price = "1090€",
                        Description = "Pour les entreprises qui veulent développer leur visibilité et générer des contacts.",
                        FeaturesJson = JsonSerializer.Serialize(new[]
                        {
                            "Jusqu'à 10 pages",
                            "Design sur mesure",
                            "SEO optimisé",
                            "Google Analytics",
                            "Google Search Console",
                            "Optimisation des performances",
                            "Formation à la prise en main",
                            "30 jours de support inclus",
                        }),
                        Highlighted = true,
                        SortOrder = 1,
                    },
                    new PackageOffer
                    {
                        Id = Guid.NewGuid(),
                        Name = "Sur mesure",
                        Price = "1990€",
                        Description = "Pour les projets plus avancés : applications web, automatisations et fonctionnalités spécifiques.",
                        FeaturesJson = JsonSerializer.Serialize(new[]
                        {
                            "Pages avancées ou illimitées selon le projet",
                            "Animations avancées",
                            "Blog",
                            "Espace membre",
                            "Réservation en ligne",
                            "Automatisations",
                            "Intégration API",
                            "Fonctionnalités IA",
                            "Tableau de bord",
                        }),
                        Highlighted = false,
                        SortOrder = 2,
                    }
                );
                await db.SaveChangesAsync();
            }

            var offers = await db.PackageOffers.OrderBy(o => o.SortOrder).ToListAsync();
            return Results.Ok(offers.Select(ToPublicShape));
        });

        app.MapPost("/api/admin/package-offers", async (PackageOfferInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();

            var maxSortOrder = await db.PackageOffers.Select(o => (int?)o.SortOrder).MaxAsync() ?? -1;
            var offer = new PackageOffer
            {
                Id = Guid.NewGuid(),
                Name = input.Name,
                Price = input.Price,
                Description = input.Description,
                FeaturesJson = JsonSerializer.Serialize(input.Features),
                Highlighted = input.Highlighted,
                SortOrder = maxSortOrder + 1,
            };

            db.PackageOffers.Add(offer);
            await db.SaveChangesAsync();
            return Results.Created($"/api/admin/package-offers/{offer.Id}", ToPublicShape(offer));
        });

        app.MapPut("/api/admin/package-offers/{id:guid}", async (Guid id, PackageOfferInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();

            var offer = await db.PackageOffers.FindAsync(id);
            if (offer is null) return Results.NotFound();

            offer.Name = input.Name;
            offer.Price = input.Price;
            offer.Description = input.Description;
            offer.FeaturesJson = JsonSerializer.Serialize(input.Features);
            offer.Highlighted = input.Highlighted;
            await db.SaveChangesAsync();
            return Results.Ok(ToPublicShape(offer));
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

    private static object ToPublicShape(PackageOffer offer) => new
    {
        offer.Id,
        offer.Name,
        offer.Price,
        offer.Description,
        Features = string.IsNullOrWhiteSpace(offer.FeaturesJson)
            ? new List<string>()
            : JsonSerializer.Deserialize<List<string>>(offer.FeaturesJson) ?? new List<string>(),
        offer.Highlighted,
        offer.SortOrder,
    };
}

public record PackageOfferInput(string Name, string Price, string Description, List<string> Features, bool Highlighted);
