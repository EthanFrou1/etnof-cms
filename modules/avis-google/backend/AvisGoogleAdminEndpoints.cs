using System.Text.Json;
using Backend;
using Microsoft.EntityFrameworkCore;

namespace Modules.AvisGoogle;

// Endpoints admin du module Avis Google : lier une fiche Google Places, rafraîchir les avis à la
// demande (jamais automatiquement — voir docs/12-plan-modules-restants.md, le champ "reviews" de
// Google Places relève du SKU payant "Enterprise + Atmosphere", contrairement au reste de l'intégration
// Google Places du projet qui n'utilise que des champs gratuits ("Basic Data", voir
// GooglePlacesEndpoints.cs), donc volontairement isolé dans son propre fichier plutôt que d'étendre
// le endpoint /details partagé (qui doit rester gratuit pour tous ses autres appelants).
public static class AvisGoogleAdminEndpoints
{
    public static void MapEndpoints(WebApplication app)
    {
        var group = app.MapGroup("/api/t/{clientSiteId:guid}/admin/avis-google");

        group.MapGet("/settings", async (Guid clientSiteId, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var settings = await db.GoogleReviewSettings.FirstOrDefaultAsync(s => s.ClientSiteId == clientSiteId);
            // Results.Ok(null)/Results.Json(null) renvoient un corps VIDE (pas le JSON "null") : les
            // typed results d'ASP.NET Core sautent l'écriture du corps quand la valeur est null, quel
            // que soit l'helper utilisé. Le frontend appelle res.json() sans filet, ce qui plantait
            // silencieusement sur un tenant n'ayant encore lié aucune fiche Google (aucune ligne
            // GoogleReviewSettings) — la page restait bloquée sur "Chargement…". Results.Text force
            // l'écriture du littéral "null", que le frontend gère déjà (`!settings`).
            return settings is null ? Results.Text("null", "application/json") : Results.Json(settings);
        });

        group.MapPost("/link", async (Guid clientSiteId, LinkInput input, HttpRequest req, IConfiguration config, AppDbContext db, IHttpClientFactory httpFactory) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var settings = await db.GoogleReviewSettings.FirstOrDefaultAsync(s => s.ClientSiteId == clientSiteId);
            if (settings is null)
            {
                settings = new GoogleReviewSettings { Id = Guid.NewGuid(), ClientSiteId = clientSiteId };
                db.GoogleReviewSettings.Add(settings);
            }
            settings.PlaceId = input.PlaceId;
            settings.PlaceName = input.PlaceName;
            await db.SaveChangesAsync();

            var error = await FetchAndStoreReviewsAsync(clientSiteId, settings, config, db, httpFactory);
            if (error is not null) return Results.Json(new { error }, statusCode: 502);

            return Results.Ok(settings);
        });

        group.MapPost("/refresh", async (Guid clientSiteId, HttpRequest req, IConfiguration config, AppDbContext db, IHttpClientFactory httpFactory) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var settings = await db.GoogleReviewSettings.FirstOrDefaultAsync(s => s.ClientSiteId == clientSiteId);
            if (settings is null) return Results.BadRequest(new { error = "Aucun établissement lié pour l'instant." });

            var error = await FetchAndStoreReviewsAsync(clientSiteId, settings, config, db, httpFactory);
            if (error is not null) return Results.Json(new { error }, statusCode: 502);

            return Results.Ok(settings);
        });

        group.MapGet("/reviews", async (Guid clientSiteId, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var reviews = await db.GoogleReviews
                .Where(r => r.ClientSiteId == clientSiteId)
                .OrderByDescending(r => r.GoogleTime)
                .ToListAsync();

            return Results.Ok(reviews);
        });

        group.MapPut("/reviews/{id:guid}", async (Guid clientSiteId, Guid id, SelectInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var review = await db.GoogleReviews.FirstOrDefaultAsync(r => r.Id == id && r.ClientSiteId == clientSiteId);
            if (review is null) return Results.NotFound();

            review.Selected = input.Selected;
            await db.SaveChangesAsync();
            return Results.Ok(review);
        });
    }

    // Appelle Google Place Details avec fields=rating,user_ratings_total,reviews (SKU payant, voir
    // commentaire en tête de fichier) et met à jour settings + la liste d'avis. Upsert par
    // (ClientSiteId, GoogleTime) : préserve `Selected` pour un avis déjà connu, jamais de suppression
    // d'un avis que Google ne renvoie plus (portée V1 volontairement simple, voir docs/12).
    // Retourne un message d'erreur (string) en cas d'échec, null en cas de succès.
    private static async Task<string?> FetchAndStoreReviewsAsync(
        Guid clientSiteId, GoogleReviewSettings settings, IConfiguration config, AppDbContext db, IHttpClientFactory httpFactory)
    {
        var apiKey = config["GooglePlaces:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey)) return "Avis Google indisponible (clé non configurée).";

        var client = httpFactory.CreateClient();
        var fields = "rating,user_ratings_total,reviews";
        var url = $"https://maps.googleapis.com/maps/api/place/details/json?place_id={Uri.EscapeDataString(settings.PlaceId)}&fields={fields}&language=fr&key={apiKey}";
        using var response = await client.GetAsync(url);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = doc.RootElement;

        if (root.GetProperty("status").GetString() != "OK")
        {
            var message = root.TryGetProperty("error_message", out var m) ? m.GetString() : root.GetProperty("status").GetString();
            return $"Récupération des avis Google : {message}";
        }

        var result = root.GetProperty("result");
        settings.AverageRating = result.TryGetProperty("rating", out var rating) ? rating.GetDouble() : null;
        settings.UserRatingsTotal = result.TryGetProperty("user_ratings_total", out var total) ? total.GetInt32() : null;
        settings.LastFetchedAt = DateTime.UtcNow;

        if (result.TryGetProperty("reviews", out var reviewsEl))
        {
            var existing = await db.GoogleReviews.Where(r => r.ClientSiteId == clientSiteId).ToListAsync();
            var fetchedAt = DateTime.UtcNow;

            foreach (var r in reviewsEl.EnumerateArray())
            {
                var time = r.GetProperty("time").GetInt64();
                var match = existing.FirstOrDefault(e => e.GoogleTime == time);

                if (match is null)
                {
                    match = new GoogleReview { Id = Guid.NewGuid(), ClientSiteId = clientSiteId, GoogleTime = time, Selected = false };
                    db.GoogleReviews.Add(match);
                }

                match.AuthorName = r.TryGetProperty("author_name", out var a) ? a.GetString() ?? "" : "";
                match.ProfilePhotoUrl = r.TryGetProperty("profile_photo_url", out var p) ? p.GetString() : null;
                match.Rating = r.TryGetProperty("rating", out var rt) ? rt.GetInt32() : 0;
                match.Text = r.TryGetProperty("text", out var t) ? t.GetString() ?? "" : "";
                match.RelativeTimeDescription = r.TryGetProperty("relative_time_description", out var rel) ? rel.GetString() ?? "" : "";
                match.FetchedAt = fetchedAt;
            }
        }

        await db.SaveChangesAsync();
        return null;
    }
}

public record LinkInput(string PlaceId, string PlaceName);
public record SelectInput(bool Selected);
