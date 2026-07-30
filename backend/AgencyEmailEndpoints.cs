using Microsoft.EntityFrameworkCore;

namespace Backend;

// Config Brevo de l'agence (clé API) — voir AgencyEmailSettings.cs. Réservé à Ethan (AdminAuth).
public static class AgencyEmailEndpoints
{
    public static void MapEndpoints(WebApplication app)
    {
        app.MapGet("/api/admin/email-settings", async (HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();

            var settings = await GetOrCreateAsync(db);
            return Results.Ok(new { brevoApiKey = settings.BrevoApiKey ?? "" });
        });

        app.MapPut("/api/admin/email-settings", async (AgencyEmailSettingsInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();

            var settings = await GetOrCreateAsync(db);
            settings.BrevoApiKey = input.BrevoApiKey;
            await db.SaveChangesAsync();

            return Results.Ok(new { brevoApiKey = settings.BrevoApiKey ?? "" });
        });
    }

    public static async Task<AgencyEmailSettings> GetOrCreateAsync(AppDbContext db)
    {
        var settings = await db.AgencyEmailSettings.FirstOrDefaultAsync();
        if (settings is not null) return settings;

        settings = new AgencyEmailSettings { Id = Guid.NewGuid() };
        db.AgencyEmailSettings.Add(settings);
        await db.SaveChangesAsync();
        return settings;
    }
}

public record AgencyEmailSettingsInput(string BrevoApiKey);
