namespace Modules.Fidelite;

// Une ligne par tenant (retrouvée par égalité, même convention que StripeSettings/RdvSchedule) —
// absente tant que le tenant n'a jamais enregistré la page "Fidélité" de son admin (voir
// FideliteModule.cs, ComputeStateAsync gère ce cas via `Configured: false`).
public class LoyaltySettings
{
    public Guid Id { get; set; }
    public Guid ClientSiteId { get; set; }

    // "points" (X points par euro dépensé) ou "stamps" (carte à tampons, un cran par commande).
    public string Mode { get; set; } = "stamps";

    // Utilisé seulement en mode "points".
    public decimal PointsPerEuro { get; set; } = 1;

    // Points (mode "points") ou nombre de commandes (mode "stamps") nécessaires pour débloquer la
    // récompense.
    public int Threshold { get; set; } = 5;

    // Texte libre choisi par le tenant (ex. "5€ de réduction", "Café offert") — jamais appliqué
    // automatiquement au paiement, voir docs/05-roadmap-poc.md pour la décision.
    public string RewardDescription { get; set; } = string.Empty;
}
