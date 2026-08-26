using Microsoft.EntityFrameworkCore;
using Modules.AvisGoogle;
using Modules.Blog;
using Modules.Catalogue;
using Modules.Contact;
using Modules.Galerie;
using Modules.Multilingue;
using Modules.Newsletter;
using Modules.Pages;
using Modules.Rdv;
using Modules.Stripe;

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
    public DbSet<ProductSize> ProductSizes => Set<ProductSize>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<ProductReview> ProductReviews => Set<ProductReview>();
    public DbSet<Collection> Collections => Set<Collection>();
    public DbSet<ModulePrice> ModulePrices => Set<ModulePrice>();
    public DbSet<EstablishmentImage> EstablishmentImages => Set<EstablishmentImage>();
    public DbSet<RdvSchedule> RdvSchedules => Set<RdvSchedule>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<NewsletterSubscriber> NewsletterSubscribers => Set<NewsletterSubscriber>();
    public DbSet<GoogleReviewSettings> GoogleReviewSettings => Set<GoogleReviewSettings>();
    public DbSet<GoogleReview> GoogleReviews => Set<GoogleReview>();
    public DbSet<StripeSettings> StripeSettings => Set<StripeSettings>();
    public DbSet<CompanyProfile> CompanyProfiles => Set<CompanyProfile>();
    public DbSet<BillingClient> BillingClients => Set<BillingClient>();
    public DbSet<Quote> Quotes => Set<Quote>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<AgencyStripeSettings> AgencyStripeSettings => Set<AgencyStripeSettings>();
    public DbSet<AgencyEmailSettings> AgencyEmailSettings => Set<AgencyEmailSettings>();
    public DbSet<PackageOffer> PackageOffers => Set<PackageOffer>();
    public DbSet<ContentTranslation> ContentTranslations => Set<ContentTranslation>();
    public DbSet<GalleryImage> GalleryImages => Set<GalleryImage>();
    public DbSet<CustomPage> CustomPages => Set<CustomPage>();
}
