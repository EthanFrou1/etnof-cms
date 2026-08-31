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

    // Null pour un produit sans tailles (voir ProductSize.cs) — copié comme ProductName/UnitPrice,
    // reste correct même si la taille est ensuite supprimée du produit.
    public string? SizeLabel { get; set; }

    // Copie de la photo de couverture du produit au moment de la commande (même raison que
    // ProductName/UnitPrice ci-dessus : reste correcte même si le produit ou ses photos sont ensuite
    // modifiés/supprimés). Null si le produit n'avait aucune photo à cet instant — l'historique de
    // commande (AccountPage.tsx) retombe alors sur un espace réservé, jamais une image cassée.
    public string? ImagePath { get; set; }
}
