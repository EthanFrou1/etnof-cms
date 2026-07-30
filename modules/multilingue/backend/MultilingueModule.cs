using Backend;
using Microsoft.EntityFrameworkCore;

namespace Modules.Multilingue;

// Module transverse (voir docs/12-plan-modules-restants.md, catégorie B) : pas d'endpoints publics
// propres, mais un helper partagé appelé par ContentEndpoints.cs (site + offres) et BlogModule.cs
// (articles) pour fusionner les traductions dans leur réponse existante, seulement si ce module est
// autorisé+activé pour le tenant ET que la locale demandée est supportée — sinon comportement
// inchangé (toujours le français stocké dans SiteContent/Offer/BlogPost).
public static class MultilingueModule
{
    public const string Name = "multilingue";
    public static readonly string[] SupportedLocales = { "en", "es" };

    public static bool IsSupportedLocale(string? locale) => locale is not null && SupportedLocales.Contains(locale);

    public static async Task<Dictionary<string, string>> GetFieldsAsync(
        AppDbContext db, Guid clientSiteId, string entityType, Guid? entityId, string locale)
    {
        return await db.ContentTranslations
            .Where(t => t.ClientSiteId == clientSiteId && t.EntityType == entityType && t.EntityId == entityId && t.Locale == locale)
            .ToDictionaryAsync(t => t.Field, t => t.Value);
    }

    // Même chose que GetFieldsAsync mais pour toutes les entités d'un type à la fois (offres,
    // articles de blog) — évite une requête par ligne.
    public static async Task<Dictionary<Guid, Dictionary<string, string>>> GetFieldsForManyAsync(
        AppDbContext db, Guid clientSiteId, string entityType, string locale)
    {
        var rows = await db.ContentTranslations
            .Where(t => t.ClientSiteId == clientSiteId && t.EntityType == entityType && t.Locale == locale && t.EntityId != null)
            .ToListAsync();

        return rows
            .GroupBy(t => t.EntityId!.Value)
            .ToDictionary(g => g.Key, g => g.ToDictionary(t => t.Field, t => t.Value));
    }

    // Une traduction vide retombe sur l'original plutôt que d'afficher un champ blanc — un client
    // qui n'a traduit qu'une partie de son contenu garde toujours un site complet dans chaque langue.
    public static string Merge(string original, Dictionary<string, string> translations, string field) =>
        translations.TryGetValue(field, out var value) && !string.IsNullOrWhiteSpace(value) ? value : original;

    // N'appelle pas SaveChangesAsync — laisse l'appelant grouper plusieurs upserts (ex. siteName +
    // description) dans un seul SaveChanges.
    public static async Task UpsertAsync(
        AppDbContext db, Guid clientSiteId, string entityType, Guid? entityId, string locale, string field, string value)
    {
        var row = await db.ContentTranslations.FirstOrDefaultAsync(t =>
            t.ClientSiteId == clientSiteId && t.EntityType == entityType && t.EntityId == entityId && t.Locale == locale && t.Field == field);

        if (row is null)
        {
            row = new ContentTranslation
            {
                Id = Guid.NewGuid(),
                ClientSiteId = clientSiteId,
                EntityType = entityType,
                EntityId = entityId,
                Locale = locale,
                Field = field,
            };
            db.ContentTranslations.Add(row);
        }

        row.Value = value;
    }
}
