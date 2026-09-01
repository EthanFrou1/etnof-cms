using Backend;
using Microsoft.EntityFrameworkCore;
using Modules.CompteClient;

namespace Modules.Fidelite;

// Programme de fidélité configurable par tenant (points ou carte à tampons, voir LoyaltySettings.cs)
// — affichage seul, aucune réduction appliquée automatiquement au paiement (décision explicite
// d'Ethan, voir docs/05-roadmap-poc.md) : une fois le palier atteint, c'est au tenant de gérer la
// récompense comme il l'entend, puis de la marquer "utilisée" depuis la fiche client pour repartir
// à zéro. Nécessite le module Compte client (progression rattachée à un `Customer`, jamais un achat
// invité) — dépendance documentée dans module.meta.json, non techniquement forcée (voir
// ModuleMetaRegistry.cs, comme les autres dépendances du socle).
public static class FideliteModule
{
    public const string Name = "fidelite";

    public static void MapEndpoints(WebApplication app)
    {
        var group = app.MapGroup("/api/t/{clientSiteId:guid}/admin/loyalty-settings");

        group.MapGet("", async (Guid clientSiteId, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var settings = await db.LoyaltySettings.FirstOrDefaultAsync(s => s.ClientSiteId == clientSiteId);
            return Results.Ok(ToSettingsDto(settings));
        });

        group.MapPut("", async (Guid clientSiteId, LoyaltySettingsDto input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            if (input.Mode != "points" && input.Mode != "stamps")
            {
                return Results.BadRequest(new { error = "Mode invalide." });
            }
            if (input.Threshold <= 0)
            {
                return Results.BadRequest(new { error = "Le palier doit être positif." });
            }
            if (input.PointsPerEuro < 0)
            {
                return Results.BadRequest(new { error = "Les points par euro ne peuvent pas être négatifs." });
            }

            var settings = await db.LoyaltySettings.FirstOrDefaultAsync(s => s.ClientSiteId == clientSiteId);
            if (settings is null)
            {
                settings = new LoyaltySettings { Id = Guid.NewGuid(), ClientSiteId = clientSiteId };
                db.LoyaltySettings.Add(settings);
            }

            settings.Mode = input.Mode;
            settings.PointsPerEuro = input.PointsPerEuro;
            settings.Threshold = input.Threshold;
            settings.RewardDescription = input.RewardDescription.Trim();
            await db.SaveChangesAsync();

            return Results.Ok(ToSettingsDto(settings));
        });

        // Vue admin d'un client précis (fiche client, CustomerDetailPage.tsx) — même auth que le reste
        // de la gestion clients (pas réservé au Propriétaire).
        app.MapGet("/api/t/{clientSiteId:guid}/admin/loyalty/customers/{customerId:guid}", async (
            Guid clientSiteId, Guid customerId, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var customer = await db.Customers.FirstOrDefaultAsync(c => c.Id == customerId && c.ClientSiteId == clientSiteId);
            if (customer is null) return Results.NotFound();

            return Results.Ok(await ComputeStateAsync(db, clientSiteId, customer));
        });

        // Marque la récompense de ce client comme utilisée — repart à zéro (seules les commandes
        // passées après cette date recompteront pour le prochain palier).
        app.MapPost("/api/t/{clientSiteId:guid}/admin/loyalty/customers/{customerId:guid}/redeem", async (
            Guid clientSiteId, Guid customerId, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var customer = await db.Customers.FirstOrDefaultAsync(c => c.Id == customerId && c.ClientSiteId == clientSiteId);
            if (customer is null) return Results.NotFound();

            customer.LoyaltyRedeemedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            return Results.Ok(await ComputeStateAsync(db, clientSiteId, customer));
        });

        // Vue client connecté (module compte-client, AccountPage.tsx) — Bearer CustomerToken.
        app.MapGet("/api/t/{clientSiteId:guid}/account/loyalty", async (
            Guid clientSiteId, HttpRequest req, AppDbContext db, ModuleRegistry registry, IConfiguration config) =>
        {
            if (!await registry.IsEnabledAsync(clientSiteId, Name)) return Results.NotFound();

            var token = CustomerToken.FromAuthorizationHeader(req);
            if (!CustomerToken.TryValidate(config, token, clientSiteId, out var customerId)) return Results.Unauthorized();

            var customer = await db.Customers.FirstOrDefaultAsync(c => c.Id == customerId && c.ClientSiteId == clientSiteId);
            if (customer is null) return Results.NotFound();

            return Results.Ok(await ComputeStateAsync(db, clientSiteId, customer));
        });
    }

    private static LoyaltySettingsDto ToSettingsDto(LoyaltySettings? settings) => new(
        settings?.Mode ?? "stamps",
        settings?.PointsPerEuro ?? 1,
        settings?.Threshold ?? 5,
        settings?.RewardDescription ?? ""
    );

    private static async Task<LoyaltyStateDto> ComputeStateAsync(AppDbContext db, Guid clientSiteId, Modules.Catalogue.Customer customer)
    {
        var settings = await db.LoyaltySettings.FirstOrDefaultAsync(s => s.ClientSiteId == clientSiteId);
        if (settings is null)
        {
            return new LoyaltyStateDto(false, "stamps", 0, 1, "", 0, false, null);
        }

        var validOrders = db.Orders.Where(o =>
            o.ClientSiteId == clientSiteId && o.CustomerId == customer.Id && o.Status != "cancelled");
        if (customer.LoyaltyRedeemedAt is not null)
        {
            validOrders = validOrders.Where(o => o.CreatedAt > customer.LoyaltyRedeemedAt);
        }

        int current = settings.Mode == "points"
            ? (int)Math.Floor(await validOrders.SumAsync(o => o.Total) * settings.PointsPerEuro)
            : await validOrders.CountAsync();

        return new LoyaltyStateDto(
            true,
            settings.Mode,
            settings.Threshold,
            settings.PointsPerEuro,
            settings.RewardDescription,
            current,
            current >= settings.Threshold,
            customer.LoyaltyRedeemedAt
        );
    }
}

public record LoyaltySettingsDto(string Mode, decimal PointsPerEuro, int Threshold, string RewardDescription);

// `Configured: false` quand le tenant n'a jamais enregistré la page Fidélité — les autres champs sont
// alors des valeurs par défaut sans signification, le frontend ne doit s'appuyer que sur ce booléen.
public record LoyaltyStateDto(
    bool Configured,
    string Mode,
    int Threshold,
    decimal PointsPerEuro,
    string RewardDescription,
    int Current,
    bool Reached,
    DateTime? RedeemedAt
);
