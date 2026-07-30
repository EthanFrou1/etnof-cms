using Microsoft.EntityFrameworkCore;

namespace Backend;

// Config Stripe de l'agence (clé secrète + secret de webhook) — voir AgencyStripeSettings.cs.
// Réservé à Ethan (AdminAuth), jamais exposé publiquement.
public static class AgencyStripeEndpoints
{
    public static void MapEndpoints(WebApplication app)
    {
        app.MapGet("/api/admin/stripe-settings", async (HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();

            var settings = await GetOrCreateAsync(db);
            return Results.Ok(new { secretKey = settings.SecretKey ?? "", webhookSecret = settings.WebhookSecret ?? "" });
        });

        app.MapPut("/api/admin/stripe-settings", async (AgencyStripeSettingsInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();

            var settings = await GetOrCreateAsync(db);
            settings.SecretKey = input.SecretKey;
            settings.WebhookSecret = input.WebhookSecret;
            await db.SaveChangesAsync();

            return Results.Ok(new { secretKey = settings.SecretKey ?? "", webhookSecret = settings.WebhookSecret ?? "" });
        });
    }

    public static async Task<AgencyStripeSettings> GetOrCreateAsync(AppDbContext db)
    {
        var settings = await db.AgencyStripeSettings.FirstOrDefaultAsync();
        if (settings is not null) return settings;

        settings = new AgencyStripeSettings { Id = Guid.NewGuid() };
        db.AgencyStripeSettings.Add(settings);
        await db.SaveChangesAsync();
        return settings;
    }
}

public record AgencyStripeSettingsInput(string SecretKey, string WebhookSecret);
