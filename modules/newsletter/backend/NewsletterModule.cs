using Backend;
using Microsoft.EntityFrameworkCore;

namespace Modules.Newsletter;

public static class NewsletterModule
{
    public const string Name = "newsletter";

    public static void MapEndpoints(WebApplication app)
    {
        app.MapPost("/api/t/{clientSiteId:guid}/newsletter/subscribe", async (Guid clientSiteId, SubscribeInput input, AppDbContext db, ModuleRegistry registry) =>
        {
            if (!await registry.IsEnabledAsync(clientSiteId, Name)) return Results.NotFound();

            var email = input.Email.Trim();
            if (email.Length == 0) return Results.BadRequest(new { error = "Email requis." });

            // Idempotent : une inscription déjà existante ne renvoie pas d'erreur (évite de révéler
            // si un email est déjà inscrit, et pas de doublon dans l'export CSV).
            var alreadySubscribed = await db.NewsletterSubscribers
                .AnyAsync(s => s.ClientSiteId == clientSiteId && s.Email.ToLower() == email.ToLower());

            if (!alreadySubscribed)
            {
                db.NewsletterSubscribers.Add(new NewsletterSubscriber
                {
                    Id = Guid.NewGuid(),
                    ClientSiteId = clientSiteId,
                    Email = email,
                    CreatedAt = DateTime.UtcNow,
                });
                await db.SaveChangesAsync();
            }

            return Results.Ok(new { subscribed = true });
        });
    }
}

public record SubscribeInput(string Email);
