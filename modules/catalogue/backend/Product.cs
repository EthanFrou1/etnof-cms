namespace Modules.Catalogue;

public class Product
{
    public Guid Id { get; set; }
    public Guid ClientSiteId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int Stock { get; set; }
    public DateTime CreatedAt { get; set; }

    // Pas de navigation EF vers Collection (même choix que Offer.ProductId/OrderItem.ProductId,
    // voir docs/03-modele-donnees.md) : simple colonne, pas de contrainte FK en base. Supprimer une
    // collection remet explicitement ce champ à null sur ses produits (CatalogueAdminEndpoints.cs)
    // plutôt que de dépendre d'un comportement de cascade implicite.
    public Guid? CollectionId { get; set; }

    // "Mis en avant" sur la home — même nom que PackageOffer.Highlighted (mise en avant d'un item
    // éditable dans une liste gérée par l'admin), pas "IsFeatured".
    public bool Highlighted { get; set; }

    public List<ProductImage> Images { get; set; } = new();

    // Facultatif — voir ProductSize.cs. Ordonné par SortOrder à l'affichage (StripeModule.cs,
    // CatalogueModule.cs), jamais réordonnable en V1 (pas de glisser-déposer comme pour Images).
    public List<ProductSize> Sizes { get; set; } = new();
}
