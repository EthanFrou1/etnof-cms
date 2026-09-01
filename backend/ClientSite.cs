namespace Backend;

// Un tenant de la plateforme multi-tenant : un client, avec son propre contenu, ses propres
// modules actifs, son propre mot de passe d'admin. Voir docs/07-admin-global.md et le plan de
// passage en multi-tenant (2026-07-26).
public class ClientSite
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string SiteType { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string Status { get; set; } = "En cours";
    public string PasswordHash { get; set; } = string.Empty;

    // Remplace l'ancien site.config.json, un objet JSON par tenant, même forme que la clé
    // "modules" d'origine : {"contact":{"enabled":true},"maps":{"enabled":true,"address":"...","apiKey":"..."}}
    public string ModulesConfigJson { get; set; } = "{}";

    // Mise en page du site public — valeurs connues : "hestia", "helios". Voir frontend/src/templates/.
    public string TemplateId { get; set; } = "hestia";

    // Variante de couleurs du template choisi, modifiable par le client depuis son admin en plus du
    // template lui-même. Valeurs connues par template : voir TemplateEndpoints.KnownPalettesByTemplate
    // (backend) et frontend/src/templates/registry.ts (couleurs + labels affichés dans l'admin).
    public string PaletteId { get; set; } = "argile";

    // Couleur d'accent libre choisie via un color picker (voir SiteSection.tsx), utilisée seulement
    // quand PaletteId == "custom" (voir TemplateEndpoints, frontend/src/templates/registry.ts
    // resolvePalette) — le fond, lui, reste toujours celui d'un preset du template, jamais personnalisable.
    public string? CustomAccent { get; set; }

    public DateTime CreatedAt { get; set; }

    // Snapshot du template/palette/accent tel que publié (voir PublishEndpoints.cs) — distinct de
    // TemplateId/PaletteId/CustomAccent ci-dessus qui reflètent le brouillon en cours d'édition dans
    // l'admin. PublishedAt reste null tant que le tenant n'a jamais cliqué "Rafraîchir le site" : dans
    // ce cas l'endpoint public retombe sur les valeurs live (voir TemplateEndpoints, /template/published).
    public string? PublishedTemplateId { get; set; }
    public string? PublishedPaletteId { get; set; }
    public string? PublishedCustomAccent { get; set; }
    public DateTime? PublishedAt { get; set; }

    // Logo du tenant — utilisé comme favicon et affiché à côté de la description Établissement sur le
    // site public (voir TemplateHestia.tsx/TemplateHelios.tsx). Même principe brouillon/publié que les
    // champs Published* ci-dessus : PublishedLogoPath reste null tant que le tenant n'a jamais cliqué
    // "Rafraîchir le site", auquel cas l'endpoint public retombe sur LogoPath (voir TemplateEndpoints).
    public string? LogoPath { get; set; }
    public string? PublishedLogoPath { get; set; }

    // Domaine personnalisé du client (ex. "boulangerie-dupont.fr"), toujours normalisé en minuscules
    // sans protocole/chemin/"www." (voir DomainEndpoints.NormalizeDomain) — distinct de `Url` ci-dessus
    // qui reste un simple lien informatif cliquable depuis le dashboard agence. Renseigné par Ethan
    // (pas par le client lui-même) une fois le DNS du client configuré, voir docs/08-hebergement-domaines.md.
    // Tant que ce champ est vide, le site n'est joignable que via /t/{clientSiteId} (décision d'Ethan :
    // pas de sous-domaine gratuit en attendant — un site "en ligne" a forcément son propre domaine).
    public string? CustomDomain { get; set; }
}
