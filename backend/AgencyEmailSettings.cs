namespace Backend;

// Clé API Brevo de l'agence (envoi de l'email de confirmation de paiement) — singleton comme
// CompanyProfile/AgencyStripeSettings, jamais exposé sur un endpoint public.
public class AgencyEmailSettings
{
    public Guid Id { get; set; }
    public string? BrevoApiKey { get; set; }
}
