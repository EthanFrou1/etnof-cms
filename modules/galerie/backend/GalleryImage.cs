namespace Modules.Galerie;

// Même forme qu'EstablishmentImage (backend/EstablishmentImage.cs), mais rattachée au module
// (pas de plafond de 3 photos, module désactivable indépendamment) plutôt qu'au socle.
public class GalleryImage
{
    public Guid Id { get; set; }
    public Guid ClientSiteId { get; set; }
    public string Path { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}
