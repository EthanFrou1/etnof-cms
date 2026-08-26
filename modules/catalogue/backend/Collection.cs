namespace Modules.Catalogue;

// Regroupement simple de produits (pas de tags multiples — un produit appartient à 0 ou 1
// collection, voir docs/04-catalogue-modules.md). Sert de filtre sur la page boutique du template
// Charis et de repère côté admin (ProductsSection.tsx) quand le catalogue devient volumineux.
public class Collection
{
    public Guid Id { get; set; }
    public Guid ClientSiteId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}
