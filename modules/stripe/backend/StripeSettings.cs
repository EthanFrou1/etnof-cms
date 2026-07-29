namespace Modules.Stripe;

// Une ligne par tenant (retrouvée par égalité, même convention que RdvSchedule/GoogleReviewSettings).
// Volontairement PAS dans ClientSite.ModulesConfigJson comme les autres champs de config module
// (ex. maps.apiKey, whatsapp.phoneNumber) : ModulesConfigJson est renvoyé tel quel par l'endpoint
// PUBLIC /api/t/{clientSiteId}/config/modules (lu par useModules() sur le site public) — une clé
// secrète Stripe ou un secret de webhook ne doivent jamais transiter par cette route. Table dédiée,
// accessible uniquement via StripeAdminEndpoints (authentifié TenantAdminAuth).
public class StripeSettings
{
    public Guid Id { get; set; }
    public Guid ClientSiteId { get; set; }
    public string? SecretKey { get; set; }
    public string? WebhookSecret { get; set; }
}
