namespace Modules.Catalogue;

public class Customer
{
    public Guid Id { get; set; }
    public Guid ClientSiteId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;

    // Adresse structurée (rue, complément optionnel, code postal, ville, pays) plutôt qu'un seul
    // champ libre — nécessaire pour qu'un transporteur puisse réellement livrer sans ambiguïté,
    // comme le fait un checkout Zara-like. Remplace l'ancien champ unique `Address` (voir migration
    // AddCustomerAddressFields, qui backfille AddressLine1 depuis l'ancienne colonne).
    public string AddressLine1 { get; set; } = string.Empty;
    public string AddressLine2 { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Country { get; set; } = "France";

    public string Notes { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    // Identifiant du Customer Stripe correspondant (module Stripe) — rempli au premier paiement d'un
    // client connecté (voir modules/stripe/backend/StripeModule.cs), réutilisé aux paiements suivants
    // pour que Stripe Checkout propose directement les cartes déjà enregistrées. Jamais renseigné pour
    // un achat invité (pas d'identité stable à laquelle rattacher la carte d'une fois sur l'autre).
    public string? StripeCustomerId { get; set; }

    // Date à laquelle le tenant a marqué la récompense fidélité comme "utilisée" (module Fidélité) —
    // seules les commandes postérieures comptent dans la progression suivante. Nullable : jamais
    // encore réclamée. Voir modules/fidelite/backend/FideliteModule.cs pour le calcul complet.
    public DateTime? LoyaltyRedeemedAt { get; set; }
}
