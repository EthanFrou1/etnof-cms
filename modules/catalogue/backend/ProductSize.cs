using System.Text.Json.Serialization;

namespace Modules.Catalogue;

// Variante de taille d'un produit (ex. "S", "M", "42") — facultatif : un produit sans taille se
// comporte exactement comme avant (Product.Stock fait foi). Dès qu'au moins une taille existe, le
// stock global du produit n'est plus utilisé pour la vente : chaque taille a le sien (voir
// StripeModule.cs, CheckoutItemInput.Size).
public class ProductSize
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string Label { get; set; } = string.Empty;
    public int Stock { get; set; }
    public int SortOrder { get; set; }

    // [JsonIgnore] : même raison que ProductImage.Product (cycle de sérialisation).
    [JsonIgnore]
    public Product? Product { get; set; }
}
