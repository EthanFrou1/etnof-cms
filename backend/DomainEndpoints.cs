using Microsoft.EntityFrameworkCore;

namespace Backend;

// Résolution nom de domaine → tenant, pour le jour où un client a son propre domaine (voir
// docs/08-hebergement-domaines.md, "Flux domaine → site client"). Tant qu'un tenant n'a pas de
// ClientSite.CustomDomain renseigné (par Ethan, côté agence), il reste accessible uniquement via
// /t/{clientSiteId} — ce fichier ne concerne que les tenants qui ont franchi cette étape.
//
// Deux usages du même endpoint public GET /api/domain-resolve :
// 1. Le frontend l'appelle au chargement quand il tourne sur un nom d'hôte qu'il ne reconnaît pas
//    (ni localhost, ni le domaine de la plateforme elle-même) pour savoir quel clientSiteId servir
//    à la place du GUID habituellement lu dans le chemin /t/{clientSiteId} (voir App.tsx).
// 2. Plus tard, le reverse proxy devant l'appli (Traefik/Coolify) pourra interroger ce même endpoint
//    avant de délivrer un certificat HTTPS pour un domaine qu'il ne connaît pas encore (pattern
//    "on-demand TLS") — un simple 200/404 suffit à cet usage, déjà couvert par cette forme de réponse.
public static class DomainEndpoints
{
    public static void MapEndpoints(WebApplication app)
    {
        app.MapGet("/api/domain-resolve", async (string? host, AppDbContext db) =>
        {
            var normalized = NormalizeDomain(host);
            if (normalized is null) return Results.BadRequest("Paramètre \"host\" manquant ou invalide.");

            var clientSiteId = await db.ClientSites
                .Where(s => s.CustomDomain == normalized)
                .Select(s => (Guid?)s.Id)
                .FirstOrDefaultAsync();

            return clientSiteId is null ? Results.NotFound() : Results.Ok(new { clientSiteId });
        });
    }

    // Minuscules, sans protocole/port/chemin, sans "www." — un client qui colle
    // "https://www.Boulangerie-Dupont.fr/" doit matcher la même valeur que "boulangerie-dupont.fr"
    // stockée en base. Utilisé à la fois à l'enregistrement (AgencyDashboardEndpoints) et ici à la
    // lecture, pour ne jamais dépendre de la façon dont le domaine a été saisi.
    public static string? NormalizeDomain(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;

        var value = raw.Trim().ToLowerInvariant();
        value = value.Replace("https://", "").Replace("http://", "");
        value = value.Split('/', '?', '#')[0]; // coupe chemin/query/fragment éventuels
        value = value.Split(':')[0]; // coupe un port éventuel (ex. "localhost:5173" en dev)
        if (value.StartsWith("www.")) value = value["www.".Length..];

        return value.Length == 0 ? null : value;
    }
}
