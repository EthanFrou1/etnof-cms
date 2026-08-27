namespace Modules.Catalogue;

// Un client final signale à un tenant qu'il souhaiterait un produit (ou une taille précise)
// actuellement en rupture — voir CatalogueModule.cs (soumission publique) et
// CatalogueAdminEndpoints.cs (consultation depuis la fiche produit, ProductDetailPage.tsx). Pas de
// notification email au tenant (décision explicite d'Ethan) : même principe que le module Contact,
// consultée dans l'admin plutôt que poussée par email.
public class StockRequest
{
    public Guid Id { get; set; }
    public Guid ClientSiteId { get; set; }
    public Guid ProductId { get; set; }

    // Copie du nom au moment de la demande, même principe que OrderItem.ProductName — reste correct
    // même si le produit est ensuite renommé ou supprimé.
    public string ProductName { get; set; } = string.Empty;

    // Null pour une rupture globale (produit sans tailles, stock à 0) — sinon la taille précise
    // demandée (voir ProductSize.cs).
    public string? SizeLabel { get; set; }

    public string Email { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
