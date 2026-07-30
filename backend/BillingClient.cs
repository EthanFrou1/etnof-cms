namespace Backend;

// Un client à qui l'agence peut envoyer un devis/une facture — distinct de ClientSite (un tenant
// hébergé sur la plateforme) : un BillingClient peut être lié à un ClientSite existant, ou exister
// seul (prospect, prestation hors-code type logo/charte graphique). Voir docs/13-facturation-devis.md.
public class BillingClient
{
    public Guid Id { get; set; }

    // Pas de FK stricte ni de navigation EF — même choix qu'Offer.ProductId (backend/SiteContent.cs) :
    // reste valide même si le ClientSite est supprimé, et un BillingClient peut ne jamais être lié.
    public Guid? ClientSiteId { get; set; }

    public string Name { get; set; } = string.Empty;
    public bool IsCompany { get; set; } = true;
    public string Siret { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
