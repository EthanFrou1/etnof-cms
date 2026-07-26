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
}
