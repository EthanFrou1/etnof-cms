using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Modules.Multilingue;

namespace Backend;

public static class ContentEndpoints
{
    public static void MapEndpoints(WebApplication app)
    {
        // Public : lu par le site du tenant pour afficher nom / description / offres. `locale`
        // optionnel (module Multilingue, voir docs/12-plan-modules-restants.md) — ignoré si le
        // module n'est pas autorisé+activé pour ce tenant ou si la locale n'est pas supportée,
        // le contenu français reste alors inchangé.
        app.MapGet("/api/t/{clientSiteId:guid}/content", async (Guid clientSiteId, string? locale, AppDbContext db, ModuleRegistry registry) =>
        {
            var content = await db.SiteContents
                .Include(c => c.Offers)
                .FirstOrDefaultAsync(c => c.ClientSiteId == clientSiteId);
            if (content is null) return Results.NotFound();

            if (MultilingueModule.IsSupportedLocale(locale) && await registry.IsEnabledAsync(clientSiteId, MultilingueModule.Name))
            {
                return Results.Ok(await ToTranslatedResponseAsync(content, locale!, clientSiteId, db));
            }

            return Results.Ok(ToResponse(content));
        });

        app.MapPut("/api/t/{clientSiteId:guid}/admin/content", async (Guid clientSiteId, SiteContentInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var content = await db.SiteContents
                .Include(c => c.Offers)
                .FirstOrDefaultAsync(c => c.ClientSiteId == clientSiteId);
            if (content is null) return Results.NotFound();

            content.SiteName = input.SiteName;
            content.Description = input.Description;
            content.EstablishmentName = input.EstablishmentName;
            content.EstablishmentType = input.EstablishmentType;
            content.Address = input.Address;
            content.Phone = input.Phone;
            content.Email = input.Email;
            content.ManagerName = input.ManagerName;
            content.ManagerPhone = input.ManagerPhone;
            content.ManagerEmail = input.ManagerEmail;
            content.GooglePlaceId = input.GooglePlaceId;
            content.GooglePlaceName = input.GooglePlaceName;
            content.OpeningHoursJson = JsonSerializer.Serialize(input.OpeningHours);

            db.Offers.RemoveRange(content.Offers);

            var newOffers = input.Offers
                .Select(o => new Offer
                {
                    Id = Guid.NewGuid(),
                    SiteContentId = content.Id,
                    Title = o.Title,
                    Price = o.Price,
                    Description = o.Description,
                    ProductId = o.ProductId,
                })
                .ToList();

            // AddRange explicite : sans ça, EF Core voit un Id (Guid) déjà renseigné sur les nouvelles
            // entités et les traite comme "existantes" (UPDATE) plutôt que "nouvelles" (INSERT).
            db.Offers.AddRange(newOffers);
            content.Offers = newOffers;

            await db.SaveChangesAsync();
            return Results.Ok(ToResponse(content));
        });
    }

    // Reforme la réponse API : OpeningHours en liste déjà parsée plutôt que la colonne JSON brute
    // OpeningHoursJson (même principe que ModulesConfigJson côté TenantAdminEndpoints).
    private static object ToResponse(SiteContent content) => new
    {
        content.Id,
        content.ClientSiteId,
        content.SiteName,
        content.Description,
        content.Offers,
        content.EstablishmentName,
        content.EstablishmentType,
        content.Address,
        content.Phone,
        content.Email,
        content.ManagerName,
        content.ManagerPhone,
        content.ManagerEmail,
        content.GooglePlaceId,
        content.GooglePlaceName,
        OpeningHours = ParseOpeningHours(content.OpeningHoursJson),
    };

    // Même forme que ToResponse, mais SiteName/Description/Offers.Title/Offers.Description passent
    // par MultilingueModule.Merge (retombe sur le français si la traduction pour ce champ est vide).
    // Adresse/téléphone/établissement restent toujours en français (pas des textes marketing).
    private static async Task<object> ToTranslatedResponseAsync(SiteContent content, string locale, Guid clientSiteId, AppDbContext db)
    {
        var siteFields = await MultilingueModule.GetFieldsAsync(db, clientSiteId, "site", null, locale);
        var offerFields = await MultilingueModule.GetFieldsForManyAsync(db, clientSiteId, "offer", locale);

        var translatedOffers = content.Offers.Select(o =>
        {
            var fields = offerFields.GetValueOrDefault(o.Id) ?? new Dictionary<string, string>();
            return new
            {
                o.Id,
                o.SiteContentId,
                Title = MultilingueModule.Merge(o.Title, fields, "title"),
                o.Price,
                Description = MultilingueModule.Merge(o.Description, fields, "description"),
                o.ProductId,
            };
        });

        return new
        {
            content.Id,
            content.ClientSiteId,
            SiteName = MultilingueModule.Merge(content.SiteName, siteFields, "siteName"),
            Description = MultilingueModule.Merge(content.Description, siteFields, "description"),
            Offers = translatedOffers,
            content.EstablishmentName,
            content.EstablishmentType,
            content.Address,
            content.Phone,
            content.Email,
            content.ManagerName,
            content.ManagerPhone,
            content.ManagerEmail,
            content.GooglePlaceId,
            content.GooglePlaceName,
            OpeningHours = ParseOpeningHours(content.OpeningHoursJson),
        };
    }

    // La colonne existe en base avec un défaut "" (pas "[]") sur les lignes créées avant la
    // migration qui l'a ajoutée, et son format a changé une fois depuis (liste de chaînes ->
    // liste de DayHoursDto structurés) — les deux cas invalides retombent sur une liste vide
    // plutôt que de faire planter la lecture du contenu.
    private static List<DayHoursDto> ParseOpeningHours(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new List<DayHoursDto>();
        try
        {
            return JsonSerializer.Deserialize<List<DayHoursDto>>(json) ?? new List<DayHoursDto>();
        }
        catch (JsonException)
        {
            return new List<DayHoursDto>();
        }
    }
}

// Horaires d'un jour : deux plages (matin / après-midi) pour permettre une pause méridienne —
// laisser une plage vide ("") si elle ne s'applique pas (ex. pas de coupure, ou jour fermé).
// Utilisé à la fois pour la colonne OpeningHoursJson (ContentEndpoints) et pour la réponse de
// GooglePlacesEndpoints.details, qui remplit ces mêmes champs depuis "opening_hours.periods".
public record DayHoursDto(bool Closed, string MorningOpen, string MorningClose, string AfternoonOpen, string AfternoonClose);

public record OfferInput(string Title, string Price, string Description, Guid? ProductId);
public record SiteContentInput(
    string SiteName,
    string Description,
    List<OfferInput> Offers,
    string EstablishmentName,
    string EstablishmentType,
    string Address,
    string Phone,
    string Email,
    string ManagerName,
    string ManagerPhone,
    string ManagerEmail,
    List<DayHoursDto> OpeningHours,
    string GooglePlaceId,
    string GooglePlaceName
);
