namespace Backend;

// Photos de l'établissement (panneau de résumé sur la page Établissement) — pas liées à un module,
// rattachées directement au tenant comme SiteContent. Voir modules/catalogue/backend/ProductImage.cs
// pour le pattern d'upload équivalent (déjà éprouvé pour les photos produits).
public class EstablishmentImage
{
    public Guid Id { get; set; }
    public Guid ClientSiteId { get; set; }
    public string Path { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}
