using Backend;
using Microsoft.EntityFrameworkCore;
using Modules.Multilingue;

namespace Modules.AvisGoogle;

public static class AvisGoogleModule
{
    public const string Name = "avis-google";

    public static void MapEndpoints(WebApplication app)
    {
        // `locale` optionnel (module Multilingue) — ignoré si Multilingue n'est pas actif pour ce
        // tenant ou si la locale n'est pas supportée. Seul le texte de l'avis est traduisible :
        // l'auteur (nom propre) et la date relative (générée par Google en français, voir
        // GooglePlacesEndpoints.cs) ne le sont pas.
        app.MapGet("/api/t/{clientSiteId:guid}/avis-google", async (Guid clientSiteId, string? locale, AppDbContext db, ModuleRegistry registry) =>
        {
            if (!await registry.IsEnabledAsync(clientSiteId, Name)) return Results.NotFound();

            var settings = await db.GoogleReviewSettings.FirstOrDefaultAsync(s => s.ClientSiteId == clientSiteId);

            // Uniquement les avis choisis par le client (Selected) — pas tout ce qui a été
            // récupéré depuis le back-office, voir AvisGoogleAdminEndpoints.
            var reviews = await db.GoogleReviews
                .Where(r => r.ClientSiteId == clientSiteId && r.Selected)
                .OrderByDescending(r => r.GoogleTime)
                .ToListAsync();

            if (MultilingueModule.IsSupportedLocale(locale) && await registry.IsEnabledAsync(clientSiteId, MultilingueModule.Name))
            {
                var translations = await MultilingueModule.GetFieldsForManyAsync(db, clientSiteId, "google-review", locale!);
                var translatedReviews = reviews.Select(r =>
                {
                    var fields = translations.GetValueOrDefault(r.Id) ?? new Dictionary<string, string>();
                    return new
                    {
                        r.Id,
                        r.AuthorName,
                        r.ProfilePhotoUrl,
                        r.Rating,
                        Text = MultilingueModule.Merge(r.Text, fields, "text"),
                        r.RelativeTimeDescription,
                        r.Selected,
                    };
                });

                return Results.Ok(new
                {
                    AverageRating = settings?.AverageRating,
                    UserRatingsTotal = settings?.UserRatingsTotal,
                    Reviews = translatedReviews,
                });
            }

            return Results.Ok(new
            {
                AverageRating = settings?.AverageRating,
                UserRatingsTotal = settings?.UserRatingsTotal,
                Reviews = reviews,
            });
        });
    }
}
