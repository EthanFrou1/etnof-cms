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
    public string Email { get; set; } = string.Empty;

    // Coordonnées du responsable (contact interne, jamais affiché publiquement — distinct des
    // champs ci-dessus qui eux alimentent le site public).
    public string ManagerName { get; set; } = string.Empty;
    public string ManagerPhone { get; set; } = string.Empty;
    public string ManagerEmail { get; set; } = string.Empty;

    // JSON sérialisé d'une liste de 7 DayHoursDto (lundi -> dimanche) — même convention que
    // ClientSite.ModulesConfigJson : colonne texte brute, parsée/reformée à la frontière API
    // (voir ContentEndpoints.ToResponse) plutôt qu'une collection mappée par EF Core. Le format
    // stocké dans cette colonne texte peut changer librement (ex. l'ancien format était une simple
    // liste de chaînes) sans migration EF Core, seule la désérialisation change.
    public string OpeningHoursJson { get; set; } = "[]";
}

public class Offer
{
    public Guid Id { get; set; }
    public Guid SiteContentId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Price { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    // Lien facultatif vers un produit du module Catalogue (Modules.Catalogue.Product) — sert à
    // reprendre son nom/prix pour préremplir l'offre côté admin (voir OffersSection.tsx). Pas de
    // navigation EF ni de contrainte FK, même choix que Order.CustomerId (modules/catalogue/backend/
    // Order.cs) : reste utilisable même pour un tenant sans le module Catalogue (toujours null dans
    // ce cas), et évite à ce fichier "core" de dépendre du module.
    public Guid? ProductId { get; set; }
}
