namespace Modules.Catalogue;

// Note interne sur une commande (jamais visible du client) — pour garder trace d'un détail utile
// ("colis renvoyé, adresse incomplète", "client a demandé un délai"...) directement au bon endroit
// plutôt que dans les messages du module Contact ou nulle part.
public class OrderComment
{
    public Guid Id { get; set; }
    public Guid ClientSiteId { get; set; }
    public Guid OrderId { get; set; }
    public string AuthorLabel { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
