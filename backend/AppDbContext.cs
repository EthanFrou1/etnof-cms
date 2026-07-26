using Microsoft.EntityFrameworkCore;
using Modules.Blog;
using Modules.Catalogue;
using Modules.Contact;

namespace Backend;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<ContactMessage> ContactMessages => Set<ContactMessage>();
    public DbSet<SiteContent> SiteContents => Set<SiteContent>();
    public DbSet<Offer> Offers => Set<Offer>();
    public DbSet<BlogPost> BlogPosts => Set<BlogPost>();
    public DbSet<ClientSite> ClientSites => Set<ClientSite>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductImage> ProductImages => Set<ProductImage>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<ModulePrice> ModulePrices => Set<ModulePrice>();
    public DbSet<EstablishmentImage> EstablishmentImages => Set<EstablishmentImage>();
}
