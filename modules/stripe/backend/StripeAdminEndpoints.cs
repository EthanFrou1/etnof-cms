using Backend;
using Microsoft.EntityFrameworkCore;

namespace Modules.Stripe;

// Endpoints admin du module Stripe : lecture/écriture de la clé secrète et du secret de webhook du
// tenant. Toujours authentifié (TenantAdminAuth) — ces valeurs ne transitent jamais par l'endpoint
// public /config/modules (voir StripeSettings.cs).
public static class StripeAdminEndpoints
{
    public static void MapEndpoints(WebApplication app)
    {
        var group = app.MapGroup("/api/t/{clientSiteId:guid}/admin/stripe");

        group.MapGet("/settings", async (Guid clientSiteId, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            // Owner-only : clés Stripe secrètes, un compte Employé n'y a pas accès (ni en lecture ni
            // en écriture) — voir TenantAdminAuth.IsOwnerAuthorizedAsync.
            if (!await TenantAdminAuth.IsOwnerAuthorizedAsync(req, config, clientSiteId)) return Results.Unauthorized();

            var settings = await db.StripeSettings.FirstOrDefaultAsync(s => s.ClientSiteId == clientSiteId);
            return Results.Ok(new
            {
                secretKey = settings?.SecretKey ?? "",
                webhookSecret = settings?.WebhookSecret ?? "",
            });
        });

        group.MapPut("/settings", async (Guid clientSiteId, SettingsInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            // Owner-only : clés Stripe secrètes, un compte Employé n'y a pas accès (ni en lecture ni
            // en écriture) — voir TenantAdminAuth.IsOwnerAuthorizedAsync.
            if (!await TenantAdminAuth.IsOwnerAuthorizedAsync(req, config, clientSiteId)) return Results.Unauthorized();

            var settings = await db.StripeSettings.FirstOrDefaultAsync(s => s.ClientSiteId == clientSiteId);
            if (settings is null)
            {
                settings = new StripeSettings { Id = Guid.NewGuid(), ClientSiteId = clientSiteId };
                db.StripeSettings.Add(settings);
            }

            settings.SecretKey = input.SecretKey;
            settings.WebhookSecret = input.WebhookSecret;
            await db.SaveChangesAsync();

            return Results.Ok(new { secretKey = settings.SecretKey, webhookSecret = settings.WebhookSecret });
        });
    }
}

public record SettingsInput(string SecretKey, string WebhookSecret);
