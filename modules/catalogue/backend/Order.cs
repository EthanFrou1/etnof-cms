namespace Modules.Catalogue;

public class Order
{
    public Guid Id { get; set; }
    public Guid ClientSiteId { get; set; }
    public Guid CustomerId { get; set; }

    // Snapshot au moment de la commande (même logique que OrderItem.ProductName/UnitPrice) :
    // l'historique reste correct même si la fiche Customer est éditée après coup.
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;

    // "pending" (à traiter), "fulfilled" (traitée), "cancelled" (annulée, stock restauré)
    public string Status { get; set; } = "pending";
    public decimal Total { get; set; }
    public DateTime CreatedAt { get; set; }

    public List<OrderItem> Items { get; set; } = new();
}
