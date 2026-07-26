namespace Backend;

public class SiteContent
{
    public Guid Id { get; set; }
    public Guid ClientSiteId { get; set; }
    public string SiteName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<Offer> Offers { get; set; } = new();

    // Infos factuelles de l'établissement (page "Établissement", distincte de "Contenu" qui reste
    // pour le texte marketing) — partagées entre modules, ex. Maps lit Address au lieu d'avoir sa
    // propre copie. Remplissable manuellement ou via la recherche Google Places.
    public string EstablishmentName { get; set; } = string.Empty;
    public string EstablishmentType { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
}

public class Offer
{
    public Guid Id { get; set; }
    public Guid SiteContentId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Price { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}
