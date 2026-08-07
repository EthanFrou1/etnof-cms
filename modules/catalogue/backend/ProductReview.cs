namespace Modules.Catalogue;

// Avis laissé par un visiteur sur un produit — même pattern de curation que GoogleReview.Selected
// (modules/avis-google/backend/GoogleReview.cs) : soumis publiquement par n'importe qui (pas de
// vérification d'achat en V1, voir docs/12-plan-modules-restants.md), mais affiché sur le site
// seulement une fois approuvé par le client depuis son admin.
public class ProductReview
{
    public Guid Id { get; set; }
    public Guid ClientSiteId { get; set; }
    public Guid ProductId { get; set; }
    public string AuthorName { get; set; } = string.Empty;
    public int Rating { get; set; }
    public string Comment { get; set; } = string.Empty;
    public bool Selected { get; set; }
    public DateTime CreatedAt { get; set; }
}
