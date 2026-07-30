namespace Backend;

// Formule de base (ex "Essentiel", "Business", "Sur mesure") — liste éditable par Ethan, distincte
// de ModulePrice (options à la carte). Sert à préremplir rapidement une ligne de devis/facture,
// voir AgencyBillingPage.tsx (TariffPicker). Prix en texte libre, même convention que ModulePrice.Price.
public class PackageOffer
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Price { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    // Liste de fonctionnalités affichées en bullet points sur la card — stockée en JSON (même
    // principe que ModulesConfigJson côté ClientSite) plutôt qu'un tableau Postgres natif, pour
    // rester cohérent avec le reste du projet.
    public string FeaturesJson { get; set; } = "[]";
    public bool Highlighted { get; set; }
    public int SortOrder { get; set; }
}
