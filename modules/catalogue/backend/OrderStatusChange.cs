namespace Modules.Catalogue;

// Historique des changements de statut d'une commande ("suivi") — distinct de AdminActionLog
// (backend/AdminActionLog.cs, générique à tout l'admin) : ici on garde explicitement l'ancien/nouveau
// statut pour afficher une vraie timeline sur la commande elle-même, plutôt que de retrouver
// l'information en filtrant le journal général par chemin. Même logique d'auteur (copié, pas une FK)
// que AdminActionLog.ActorLabel — reste correct même si le compte qui a agi est ensuite supprimé.
public class OrderStatusChange
{
    public Guid Id { get; set; }
    public Guid ClientSiteId { get; set; }
    public Guid OrderId { get; set; }
    public string FromStatus { get; set; } = string.Empty;
    public string ToStatus { get; set; } = string.Empty;
    public string ActorLabel { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
