namespace Backend;

// Historique des actions admin d'un tenant — capturé génériquement (voir AdminActionLogMiddleware.cs)
// plutôt qu'ajouté à la main dans chaque endpoint : toute requête d'écriture (POST/PUT/DELETE) réussie
// sous /api/t/{clientSiteId}/admin/... est enregistrée, quel que soit l'endpoint, sans entretien à
// prévoir quand une nouvelle page admin arrive. Visible par le Propriétaire (page "Historique",
// réservée comme Comptes/Modules/Stripe — un compte Employé ne voit pas cette page) et par l'agence
// (support). Les actions de l'agence via le mot de passe passe-partout sont loguées comme les autres,
// jamais masquées — décision d'Ethan : la transparence protège autant le client que l'agence.
public class AdminActionLog
{
    public Guid Id { get; set; }
    public Guid ClientSiteId { get; set; }

    // "owner" | "employee" | "agency" — voir AdminActionLogMiddleware.ResolveActor.
    public string ActorType { get; set; } = string.Empty;
    // Nom affiché : "Propriétaire", "Agence (support)", ou le prénom+nom du compte Employé au moment
    // de l'action (copié, pas une FK vers TenantAdminAccount — reste correct même si le compte est
    // ensuite supprimé, même logique que les autres snapshots du projet, ex. OrderItem.ProductName).
    public string ActorLabel { get; set; } = string.Empty;

    public string Method { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
    // Libellé lisible dérivé du chemin (voir AdminActionLogMiddleware.DescribeAction) — volontairement
    // pas une phrase écrite à la main par endpoint, pour rester complet sans entretien.
    public string Action { get; set; } = string.Empty;
    public int StatusCode { get; set; }
    public DateTime CreatedAt { get; set; }
}
