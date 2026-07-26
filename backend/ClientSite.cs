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

    // Mise en page du site public — valeurs connues : "classique", "moderne". Voir frontend/src/templates/.
    public string TemplateId { get; set; } = "classique";

    public DateTime CreatedAt { get; set; }
}
