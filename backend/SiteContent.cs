namespace Backend;

public class SiteContent
{
    public Guid Id { get; set; }
    public Guid ClientSiteId { get; set; }
    public string SiteName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    // Texte plus long ("Notre histoire") affiché dans une section dédiée sur les templates qui la
    // prennent en charge (Charis pour l'instant) — distinct de Description qui reste le court texte
    // d'accroche du hero. Facultatif : la section ne s'affiche pas tant que ce champ est vide.
    public string StoryContent { get; set; } = string.Empty;

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

    // Fiche Google Places liée depuis la recherche de cette page (voir EstablishmentSection.tsx,
    // GooglePlacesEndpoints.search/details) — gratuite, ne contient jamais d'avis. Partagée entre
    // modules : le module Avis Google (modules/avis-google/backend/AvisGoogleAdminEndpoints.cs) la
    // lit pour proposer directement "Actualiser les avis" sans re-chercher, sans jamais déclencher
    // l'appel payant "reviews" tout seul (uniquement au clic explicite du client).
    public string GooglePlaceId { get; set; } = string.Empty;
    public string GooglePlaceName { get; set; } = string.Empty;

    // CGV du tenant (HTML riche, même éditeur que Blog/Pages) — champ dédié plutôt qu'une page libre
    // du module Pages (payant, optionnel) car c'est une obligation légale pour toute boutique en
    // ligne, pas une fonctionnalité premium. Voir CartPage.tsx : le bouton "Payer par carte" reste
    // désactivé tant que ce champ est vide sur un site où Catalogue+Stripe sont actifs.
    public string CgvContent { get; set; } = string.Empty;

    // Livraison/Retours affichés dans l'accordéon de la fiche produit (charis/ProductPage.tsx,
    // PurchaseInfo) — contrairement aux CGV, pas une obligation légale : vide par défaut pour un
    // nouveau tenant (tous les commerces ne font pas de livraison/retours, ex. un salon de coiffure),
    // section correspondante simplement absente du site public tant que le champ est vide (pas de
    // blocage/avertissement comme les CGV). L'admin propose un texte suggéré à titre d'aide au
    // wording (bouton dans EstablishmentSection.tsx), jamais posé automatiquement. Les tenants créés
    // avant ce champ ont été rétroactivement remplis avec l'ancien texte générique statique qu'ils
    // affichaient déjà (voir migration AddEstablishmentDeliveryReturns) — pas de régression pour eux.
    public string DeliveryContent { get; set; } = string.Empty;
    public string ReturnsContent { get; set; } = string.Empty;

    // JSON sérialisé d'une liste de 7 DayHoursDto (lundi -> dimanche) — même convention que
    // ClientSite.ModulesConfigJson : colonne texte brute, parsée/reformée à la frontière API
    // (voir ContentEndpoints.ToResponse) plutôt qu'une collection mappée par EF Core. Le format
    // stocké dans cette colonne texte peut changer librement (ex. l'ancien format était une simple
    // liste de chaînes) sans migration EF Core, seule la désérialisation change.
    public string OpeningHoursJson { get; set; } = "[]";

    // Snapshot JSON du contenu public tel que publié (voir PublishEndpoints.cs) — distinct des champs
    // ci-dessus qui reflètent le brouillon en cours d'édition dans l'admin. Null tant que le tenant n'a
    // jamais cliqué "Rafraîchir le site" : dans ce cas l'endpoint public retombe sur le contenu live
    // (voir ContentEndpoints.MapEndpoints, /content/published) pour ne rien casser sur les sites déjà en prod.
    public string? PublishedContentJson { get; set; }
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
