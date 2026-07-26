using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace Backend;

// Proxy vers l'API Google Places (recherche libre-service, pas d'OAuth) — utilisée par la page
// Établissement de l'admin d'un tenant pour préremplir adresse/téléphone/type à partir du nom de
// l'établissement. Clé API globale à l'agence (GooglePlaces:ApiKey, appsettings.Development.json,
// gitignored) : jamais exposée au frontend, contrairement à la clé Maps Embed qui elle est par
// tenant (voir modules/maps).
public static class GooglePlacesEndpoints
{
    public static void MapEndpoints(WebApplication app)
    {
        app.MapGet("/api/t/{clientSiteId:guid}/admin/google-places/search", async (
            Guid clientSiteId, string query, HttpRequest req, IConfiguration config, AppDbContext db, IHttpClientFactory httpFactory) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var apiKey = config["GooglePlaces:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                return Results.Json(new { error = "Recherche Google indisponible (clé non configurée)." }, statusCode: 503);
            }

            if (string.IsNullOrWhiteSpace(query))
            {
                return Results.Ok(Array.Empty<object>());
            }

            var client = httpFactory.CreateClient();
            var url = $"https://maps.googleapis.com/maps/api/place/textsearch/json?query={Uri.EscapeDataString(query)}&key={apiKey}";
            using var response = await client.GetAsync(url);
            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var root = doc.RootElement;

            if (root.GetProperty("status").GetString() != "OK")
            {
                var message = root.TryGetProperty("error_message", out var m) ? m.GetString() : root.GetProperty("status").GetString();
                return Results.Json(new { error = $"Recherche Google : {message}" }, statusCode: 502);
            }

            // .ToList() : force l'évaluation immédiate — sinon la requête LINQ (paresseuse) ne
            // s'exécute qu'au moment de la sérialisation JSON, après que `doc` (using) soit déjà
            // disposed, et JsonElement.GetProperty plante avec ObjectDisposedException.
            var results = root.GetProperty("results").EnumerateArray().Take(5).Select(r => new
            {
                PlaceId = r.GetProperty("place_id").GetString(),
                Name = r.TryGetProperty("name", out var n) ? n.GetString() : "",
                Address = r.TryGetProperty("formatted_address", out var a) ? a.GetString() : "",
            }).ToList();

            return Results.Ok(results);
        });

        app.MapGet("/api/t/{clientSiteId:guid}/admin/google-places/details", async (
            Guid clientSiteId, string placeId, HttpRequest req, IConfiguration config, AppDbContext db, IHttpClientFactory httpFactory) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var apiKey = config["GooglePlaces:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                return Results.Json(new { error = "Recherche Google indisponible (clé non configurée)." }, statusCode: 503);
            }

            var client = httpFactory.CreateClient();
            var fields = "name,formatted_address,international_phone_number,type";
            var url = $"https://maps.googleapis.com/maps/api/place/details/json?place_id={Uri.EscapeDataString(placeId)}&fields={fields}&key={apiKey}";
            using var response = await client.GetAsync(url);
            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var root = doc.RootElement;

            if (root.GetProperty("status").GetString() != "OK")
            {
                var message = root.TryGetProperty("error_message", out var m) ? m.GetString() : root.GetProperty("status").GetString();
                return Results.Json(new { error = $"Recherche Google : {message}" }, statusCode: 502);
            }

            var result = root.GetProperty("result");
            var types = result.TryGetProperty("types", out var t) ? t.EnumerateArray().Select(x => x.GetString()).ToList() : new List<string?>();

            return Results.Ok(new
            {
                Name = result.TryGetProperty("name", out var n) ? n.GetString() : "",
                Address = result.TryGetProperty("formatted_address", out var a) ? a.GetString() : "",
                Phone = result.TryGetProperty("international_phone_number", out var p) ? p.GetString() : "",
                // Premier type "utile" : Google renvoie aussi des types génériques (point_of_interest,
                // establishment) qu'on préfère ignorer si un type plus précis existe.
                Type = types.FirstOrDefault(x => x != "point_of_interest" && x != "establishment") ?? types.FirstOrDefault() ?? "",
            });
        });
    }
}
