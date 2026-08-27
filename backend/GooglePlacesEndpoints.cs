using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace Backend;

// Proxy vers l'API Google Places (recherche libre-service, pas d'OAuth) — utilisée par la page
// Établissement de l'admin d'un tenant pour préremplir adresse/téléphone/type/horaires à partir du
// nom de l'établissement, et pour importer ses premières photos. Clé API globale à l'agence
// (GooglePlaces:ApiKey, appsettings.Development.json, gitignored) : jamais exposée au frontend,
// contrairement à la clé Maps Embed qui elle est par tenant (voir modules/maps).
public static class GooglePlacesEndpoints
{
    public static void MapEndpoints(WebApplication app)
    {
        app.MapGet("/api/t/{clientSiteId:guid}/admin/google-places/search", async (
            Guid clientSiteId, string query, IConfiguration config, HttpRequest req, AppDbContext db, IHttpClientFactory httpFactory) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();
            return await SearchAsync(query, config, httpFactory);
        });

        // Même recherche, côté agence (config entreprise, clients de facturation) — pas de
        // clientSiteId, auth AdminAuth (scope "agency") au lieu de TenantAdminAuth.
        app.MapGet("/api/admin/google-places/search", async (
            string query, HttpRequest req, IConfiguration config, IHttpClientFactory httpFactory) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();
            return await SearchAsync(query, config, httpFactory);
        });

        // Même recherche, sans authentification cette fois : utilisée par le champ "Adresse de
        // livraison" du panier public (voir CartPage.tsx), qui n'a par définition aucune session
        // admin. Gardée derrière le module Catalogue (pas de recherche possible sur un site où il
        // n'est pas activé) et derrière la policy "public-places" (Program.cs) pour limiter l'abus
        // vu que chaque appel consomme du quota Google payant.
        app.MapGet("/api/t/{clientSiteId:guid}/google-places/search", async (
            Guid clientSiteId, string query, IConfiguration config, ModuleRegistry registry, IHttpClientFactory httpFactory) =>
        {
            if (!await registry.IsEnabledAsync(clientSiteId, "catalogue")) return Results.NotFound();
            return await SearchAsync(query, config, httpFactory);
        }).RequireRateLimiting("public-places");

        // Appelé quand le client clique une suggestion du champ "Adresse de livraison" (voir
        // CartPage.tsx) : la recherche ci-dessus ne renvoie qu'une adresse formatée en un seul bloc
        // (`formatted_address`), pas les composants structurés (rue/code postal/ville/pays) dont a
        // besoin le nouveau formulaire de livraison. Un second appel, ciblé sur le lieu choisi, est
        // nécessaire pour les obtenir — Google ne les expose pas depuis la recherche texte. Mêmes
        // gardes que /search (module Catalogue + rate-limiting), pas d'auth (public par nature).
        app.MapGet("/api/t/{clientSiteId:guid}/google-places/address-details", async (
            Guid clientSiteId, string placeId, IConfiguration config, ModuleRegistry registry, IHttpClientFactory httpFactory) =>
        {
            if (!await registry.IsEnabledAsync(clientSiteId, "catalogue")) return Results.NotFound();

            var apiKey = config["GooglePlaces:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                return Results.Json(new { error = "Recherche Google indisponible (clé non configurée)." }, statusCode: 503);
            }

            var client = httpFactory.CreateClient();
            // "address_component" (singulier) est le nom du champ à demander dans l'API Places
            // (Legacy) — la réponse, elle, le renvoie au pluriel ("address_components"). Particularité
            // documentée de cette API, pas une faute de frappe.
            var url = $"https://maps.googleapis.com/maps/api/place/details/json?place_id={Uri.EscapeDataString(placeId)}&fields=address_component&language=fr&key={apiKey}";
            using var response = await client.GetAsync(url);
            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var root = doc.RootElement;

            if (root.GetProperty("status").GetString() != "OK")
            {
                return Results.Json(new { error = "Adresse introuvable." }, statusCode: 502);
            }

            var components = root.GetProperty("result").GetProperty("address_components");
            var streetNumber = ComponentLongName(components, "street_number");
            var route = ComponentLongName(components, "route");
            var city = ComponentLongName(components, "locality");
            if (string.IsNullOrWhiteSpace(city)) city = ComponentLongName(components, "postal_town");
            if (string.IsNullOrWhiteSpace(city)) city = ComponentLongName(components, "administrative_area_level_2");

            return Results.Ok(new
            {
                AddressLine1 = string.Join(" ", new[] { streetNumber, route }.Where(s => !string.IsNullOrWhiteSpace(s))),
                PostalCode = ComponentLongName(components, "postal_code"),
                City = city,
                Country = ComponentLongName(components, "country"),
            });
        }).RequireRateLimiting("public-places");

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
            var fields = "name,formatted_address,international_phone_number,type,opening_hours,photos";
            var url = $"https://maps.googleapis.com/maps/api/place/details/json?place_id={Uri.EscapeDataString(placeId)}&fields={fields}&language=fr&key={apiKey}";
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

            List<DayHoursDto>? openingHours = null;
            if (result.TryGetProperty("opening_hours", out var oh) && oh.TryGetProperty("periods", out var periods))
            {
                openingHours = ParsePeriods(periods);
            }

            // Seulement les références ici : le téléchargement effectif (effet de bord) se fait via
            // /import-photos (POST), pas depuis ce GET — voir plus bas.
            var photoReferences = result.TryGetProperty("photos", out var photos)
                ? photos.EnumerateArray().Take(3)
                    .Select(p => p.GetProperty("photo_reference").GetString() ?? "")
                    .Where(r => r.Length > 0)
                    .ToList()
                : new List<string>();

            return Results.Ok(new
            {
                Name = result.TryGetProperty("name", out var n) ? n.GetString() : "",
                Address = result.TryGetProperty("formatted_address", out var a) ? a.GetString() : "",
                Phone = result.TryGetProperty("international_phone_number", out var p) ? p.GetString() : "",
                // Premier type "utile" : Google renvoie aussi des types génériques (point_of_interest,
                // establishment) qu'on préfère ignorer si un type plus précis existe.
                Type = types.FirstOrDefault(x => x != "point_of_interest" && x != "establishment") ?? types.FirstOrDefault() ?? "",
                OpeningHours = openingHours,
                PhotoReferences = photoReferences,
            });
        });

        // Télécharge et enregistre les photos Google (max 3, mêmes contraintes de stockage que
        // l'upload manuel dans EstablishmentEndpoints.cs) — appelé par le frontend juste après la
        // sélection d'une fiche dans /details, séparément pour garder ce GET sans effet de bord.
        app.MapPost("/api/t/{clientSiteId:guid}/admin/google-places/import-photos", async (
            Guid clientSiteId, ImportPhotosInput input, HttpRequest req, IConfiguration config, AppDbContext db, IHttpClientFactory httpFactory, IWebHostEnvironment env) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var apiKey = config["GooglePlaces:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                return Results.Json(new { error = "Import de photos indisponible (clé non configurée)." }, statusCode: 503);
            }

            var webRoot = string.IsNullOrEmpty(env.WebRootPath)
                ? Path.Combine(env.ContentRootPath, "wwwroot")
                : env.WebRootPath;
            var uploadDir = Path.Combine(webRoot, "uploads", clientSiteId.ToString(), "establishment");
            Directory.CreateDirectory(uploadDir);

            // Calculé une seule fois puis incrémenté localement : sinon les photos importées dans
            // la même requête se verraient toutes attribuer le même SortOrder (aucune n'est encore
            // sauvegardée en base pendant la boucle, donc MaxAsync ne les voit pas).
            var nextSortOrder = (await db.EstablishmentImages
                .Where(i => i.ClientSiteId == clientSiteId)
                .Select(i => (int?)i.SortOrder)
                .MaxAsync() ?? -1) + 1;

            var client = httpFactory.CreateClient();
            var imported = new List<EstablishmentImage>();

            foreach (var photoRef in input.PhotoReferences.Take(3))
            {
                // L'API Place Photo répond par une redirection HTTP vers l'image réelle, suivie
                // automatiquement par HttpClient (AllowAutoRedirect par défaut).
                var photoUrl = $"https://maps.googleapis.com/maps/api/place/photo?maxwidth=1600&photoreference={Uri.EscapeDataString(photoRef)}&key={apiKey}";
                using var response = await client.GetAsync(photoUrl);
                if (!response.IsSuccessStatusCode) continue;

                var contentType = response.Content.Headers.ContentType?.MediaType ?? "image/jpeg";
                var extension = contentType switch
                {
                    "image/png" => ".png",
                    "image/webp" => ".webp",
                    _ => ".jpg",
                };

                var bytes = await response.Content.ReadAsByteArrayAsync();
                var fileName = $"{Guid.NewGuid()}{extension}";
                await File.WriteAllBytesAsync(Path.Combine(uploadDir, fileName), bytes);

                var image = new EstablishmentImage
                {
                    Id = Guid.NewGuid(),
                    ClientSiteId = clientSiteId,
                    Path = $"/uploads/{clientSiteId}/establishment/{fileName}",
                    SortOrder = nextSortOrder++,
                };
                db.EstablishmentImages.Add(image);
                imported.Add(image);
            }

            await db.SaveChangesAsync();
            return Results.Ok(imported);
        });
    }

    // Factorisé entre la route tenant et la route agence (mêmes deux endpoints appelants, seule
    // l'auth diffère) — recherche libre Google Places, jusqu'à 5 résultats (nom + adresse formatée).
    private static async Task<IResult> SearchAsync(string query, IConfiguration config, IHttpClientFactory httpFactory)
    {
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
        var url = $"https://maps.googleapis.com/maps/api/place/textsearch/json?query={Uri.EscapeDataString(query)}&language=fr&key={apiKey}";
        using var response = await client.GetAsync(url);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = doc.RootElement;

        if (root.GetProperty("status").GetString() != "OK")
        {
            var message = root.TryGetProperty("error_message", out var m) ? m.GetString() : root.GetProperty("status").GetString();
            return Results.Json(new { error = $"Recherche Google : {message}" }, statusCode: 502);
        }

        // .ToList() : force l'évaluation immédiate — sinon la requête LINQ (paresseuse) ne s'exécute
        // qu'au moment de la sérialisation JSON, après que `doc` (using) soit déjà disposed, et
        // JsonElement.GetProperty plante avec ObjectDisposedException.
        var results = root.GetProperty("results").EnumerateArray().Take(5).Select(r => new
        {
            PlaceId = r.GetProperty("place_id").GetString(),
            Name = r.TryGetProperty("name", out var n) ? n.GetString() : "",
            Address = r.TryGetProperty("formatted_address", out var a) ? a.GetString() : "",
        }).ToList();

        return Results.Ok(results);
    }

    // "periods" donne, par occurrence, un jour+heure d'ouverture et de fermeture — un établissement
    // avec une pause méridienne a deux occurrences pour le même jour (une le matin, une l'après-midi).
    // Google numérote les jours 0 (dimanche) à 6 (samedi) ; nos tableaux (WEEKDAYS côté frontend)
    // commencent au lundi (index 0) — (googleDay + 6) % 7 fait la conversion (dimanche -> 6, lundi -> 0).
    private static List<DayHoursDto> ParsePeriods(JsonElement periods)
    {
        var byDay = new Dictionary<int, List<(string open, string close)>>();

        foreach (var period in periods.EnumerateArray())
        {
            if (!period.TryGetProperty("open", out var openEl)) continue;

            var index = (openEl.GetProperty("day").GetInt32() + 6) % 7;
            var openTime = FormatTime(openEl.GetProperty("time").GetString());
            var closeTime = period.TryGetProperty("close", out var closeEl) ? FormatTime(closeEl.GetProperty("time").GetString()) : "";

            if (!byDay.TryGetValue(index, out var slots))
            {
                slots = new List<(string, string)>();
                byDay[index] = slots;
            }
            slots.Add((openTime, closeTime));
        }

        var result = new List<DayHoursDto>();
        for (var index = 0; index < 7; index++)
        {
            if (!byDay.TryGetValue(index, out var slots) || slots.Count == 0)
            {
                result.Add(new DayHoursDto(true, "", "", "", ""));
                continue;
            }

            // Trié par heure d'ouverture : le premier créneau devient "matin", le second (s'il
            // existe, cas d'une pause méridienne) devient "après-midi" — les créneaux au-delà sont
            // ignorés (cas rare, non géré par l'UI qui ne prévoit que deux plages par jour).
            slots.Sort((a, b) => string.CompareOrdinal(a.open, b.open));
            var morning = slots[0];
            var afternoon = slots.Count > 1 ? slots[1] : ("", "");
            result.Add(new DayHoursDto(false, morning.open, morning.close, afternoon.Item1, afternoon.Item2));
        }

        return result;
    }

    // Cherche le premier composant d'adresse dont un des "types" Google correspond, renvoie son
    // long_name ("" si absent) — un lieu donné n'a jamais deux composants du même type.
    private static string ComponentLongName(JsonElement components, string type)
    {
        foreach (var component in components.EnumerateArray())
        {
            var types = component.GetProperty("types").EnumerateArray().Select(t => t.GetString());
            if (types.Contains(type))
            {
                return component.GetProperty("long_name").GetString() ?? "";
            }
        }
        return "";
    }

    // Google renvoie l'heure en "HHmm" (4 chiffres, ex. "0900") — reformatée en "HH:mm" pour
    // correspondre à la valeur attendue par un <input type="time"> côté frontend.
    private static string FormatTime(string? raw)
    {
        if (string.IsNullOrEmpty(raw) || raw.Length != 4) return "";
        return $"{raw[..2]}:{raw[2..]}";
    }
}

public record ImportPhotosInput(List<string> PhotoReferences);
