namespace Backend;

// Config de facturation de l'agence elle-même (etnof-web), pas d'un tenant — une seule ligne en
// base, éditée depuis /admin/dashboard/facturation. Réutilisée pour générer les PDF de devis et
// factures (voir Pdf/FacturationPdfDocuments.cs). Voir docs/13-facturation-devis.md pour la
// recherche juridique qui a guidé ces champs (mentions obligatoires facture France 2026).
public class CompanyProfile
{
    public Guid Id { get; set; }
    public string LegalName { get; set; } = string.Empty;
    public string TradeName { get; set; } = string.Empty;
    public string LegalForm { get; set; } = string.Empty;
    public string Siret { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;

    // Mention TVA à faire figurer sur chaque document — par défaut la franchise en base (cas
    // d'etnof-web), éditable si le régime change un jour.
    public string VatMention { get; set; } = "TVA non applicable, art. 293 B du CGI";

    public string Iban { get; set; } = string.Empty;
    public string Bic { get; set; } = string.Empty;

    // Texte libre affiché en pied de facture (taux de pénalité de retard + indemnité forfaitaire
    // de 40€ pour frais de recouvrement) — mention obligatoire, voir docs/13-facturation-devis.md.
    public string LatePaymentMention { get; set; } =
        "En cas de retard de paiement, une pénalité au taux de 3 fois le taux d'intérêt légal est applicable, ainsi qu'une indemnité forfaitaire de 40€ pour frais de recouvrement (art. L441-10 du Code de commerce).";

    public string CgvUrl { get; set; } = string.Empty;

    // Lien vers le site vitrine de l'agence — affiché en pied des emails transactionnels
    // (BrevoEmailService.cs), pas sur les PDF (qui restent orientés client final).
    public string WebsiteUrl { get; set; } = "https://website-etnof-web.vercel.app/";

    public string? LogoPath { get; set; }
    public DateTime UpdatedAt { get; set; }
}
