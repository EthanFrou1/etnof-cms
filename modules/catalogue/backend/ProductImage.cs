using System.Text.Json.Serialization;

namespace Modules.Catalogue;

public class ProductImage
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string Path { get; set; } = string.Empty;
    public int SortOrder { get; set; }

    // [JsonIgnore] : sans ça, la sérialisation directe de Product.Images (qui inclut ce ProductImage,
    // dont le Product est refixé par EF Core) part en cycle infini. Navigation gardée pour le filtre
    // de CatalogueAdminEndpoints.DELETE /images/{id} (Where(i => i.Product!.ClientSiteId == ...)).
    [JsonIgnore]
    public Product? Product { get; set; }
}
