using System.ComponentModel.DataAnnotations;

namespace Backend;

// Prix affiché sur la card d'un module non autorisé, dans l'admin d'un tenant ("Activer pour
// {Price}"). Global au socle (pas par tenant), éditable depuis /admin/dashboard. Format libre
// (ex. "250€", "Offert") pour coller au style de docs/04-catalogue-modules.md — pas forcément un
// nombre exploitable en calcul.
public class ModulePrice
{
    [Key]
    public string ModuleName { get; set; } = string.Empty;
    public string Price { get; set; } = string.Empty;

    // Visibilité globale dans le catalogue de tous les tenants (indépendante de l'autorisation par
    // client, voir ModuleRegistry.IsAuthorized) : à false, le module n'apparaît plus dans l'admin
    // d'aucun client SAUF ceux pour qui Ethan l'a explicitement autorisé (un module déjà autorisé
    // pour un client reste visible chez lui même si Ethan le cache du catalogue général ensuite).
    // Éditée depuis PricingSection.tsx (dashboard agence).
    public bool Visible { get; set; } = true;
}
