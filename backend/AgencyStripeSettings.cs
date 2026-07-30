namespace Backend;

// Compte Stripe de l'agence elle-même (pour encaisser SES propres factures) — distinct des
// StripeSettings par tenant (modules/stripe/backend/StripeSettings.cs, qui servent le Catalogue de
// chaque client). Singleton comme CompanyProfile, jamais exposé sur un endpoint public.
public class AgencyStripeSettings
{
    public Guid Id { get; set; }
    public string? SecretKey { get; set; }
    public string? WebhookSecret { get; set; }
}
