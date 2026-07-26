namespace Modules.Catalogue;

public class Product
{
    public Guid Id { get; set; }
    public Guid ClientSiteId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int Stock { get; set; }
    public DateTime CreatedAt { get; set; }

    public List<ProductImage> Images { get; set; } = new();
}
