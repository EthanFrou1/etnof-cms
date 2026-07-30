namespace Modules.Multilingue;

// Traduction générique d'UN champ de texte pour UNE entité core/module (SiteContent, Offer,
// BlogPost) — voir docs/12-plan-modules-restants.md, catégorie B ("transverse"). Le français n'est
// jamais stocké ici : c'est déjà la valeur "de base" présente dans SiteContent/Offer/BlogPost.
// Table dédiée plutôt que d'ajouter des colonnes Locale à chaque entité traduisible — pas de FK
// stricte ni de navigation EF vers ces entités (même choix qu'Offer.ProductId), pour ne jamais
// toucher leur schéma.
public class ContentTranslation
{
    public Guid Id { get; set; }
    public Guid ClientSiteId { get; set; }
    public string EntityType { get; set; } = string.Empty; // "site" | "offer" | "blog-post"
    public Guid? EntityId { get; set; } // null pour "site" (singleton par tenant)
    public string Locale { get; set; } = string.Empty; // "en" | "es"
    public string Field { get; set; } = string.Empty; // "siteName" | "description" | "title" | "content"
    public string Value { get; set; } = string.Empty;
}
