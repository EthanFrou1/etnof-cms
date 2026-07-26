namespace Modules.Catalogue;

public class OrderItem
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public Guid ProductId { get; set; }

    // Copie du nom/prix au moment de la commande : l'historique reste correct même si le
    // produit est ensuite modifié ou supprimé.
    public string ProductName { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
}
