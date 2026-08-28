using System.Threading.RateLimiting;
using Backend;
using Microsoft.EntityFrameworkCore;
using Modules.AvisGoogle;
using Modules.Blog;
using Modules.Catalogue;
using Modules.CompteClient;
using Modules.Contact;
using Modules.Galerie;
using Modules.Multilingue;
using Modules.Newsletter;
using Modules.Pages;
using Modules.Rdv;
using Modules.Stripe;

// Utilitaire CLI : `dotnet run -- hash-password <mot-de-passe>` génère un hash à coller dans
// Admin:PasswordHash ou le mot de passe d'un tenant. Voir DEMARRAGE.md.
if (args.Length == 2 && args[0] == "hash-password")
{
    Console.WriteLine(AdminPasswordHasher.Hash(args[1]));
    return;
}

// Licence Community (gratuite tant que le CA de la structure qui l'utilise est sous 1M$/an —
// largement le cas d'etnof-web, auto-entreprise) — voir docs/13-facturation-devis.md.
QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

var builder = WebApplication.CreateBuilder(args);

// Scoped (pas Singleton) : ModuleRegistry dépend d'AppDbContext, qui est scoped par requête —
// chaque module est maintenant configuré par tenant, plus de fichier global (voir ModuleRegistry.cs).
builder.Services.AddScoped<ModuleRegistry>();
builder.Services.AddSingleton<ModuleMetaRegistry>();
builder.Services.AddHttpClient();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddHostedService<OverdueInvoiceReminderService>();

var allowedOrigin = builder.Configuration["Cors:AllowedOrigin"] ?? "http://localhost:5173";
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(allowedOrigin).AllowAnyMethod().AllowAnyHeader());
});

// Anti brute-force sur les endpoints de login admin (5 tentatives/minute/IP, pas de file d'attente —
// une 6e tentative dans la minute reçoit immédiatement 429). Intégré au framework depuis .NET 7, pas
// de dépendance ajoutée. Voir AgencyDashboardEndpoints.cs / TenantAdminEndpoints.cs pour l'usage.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("login", httpContext => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        factory: _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 5,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
        }));

    // Recherche Google Places exposée sans authentification pour l'autocomplete d'adresse du panier
    // public (voir GooglePlacesEndpoints.cs) : chaque requête coûte de l'argent côté Google, donc on
    // limite le débit par IP plutôt que de laisser l'endpoint totalement ouvert.
    options.AddPolicy("public-places", httpContext => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        factory: _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 15,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
        }));
});

var app = builder.Build();

app.UseCors();
app.UseRateLimiter();

// Sert les photos produits uploadées (backend/wwwroot/uploads/{clientSiteId}/{productId}/...).
app.UseStaticFiles();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));

// Public : config des modules d'UN tenant (utilisé par useModules() côté frontend).
app.MapGet("/api/t/{clientSiteId:guid}/config/modules", async (Guid clientSiteId, ModuleRegistry registry) =>
    Results.Ok(await registry.GetModulesAsync(clientSiteId)));

ContentEndpoints.MapEndpoints(app);
TenantAdminEndpoints.MapEndpoints(app);
TemplateEndpoints.MapEndpoints(app);
PublishEndpoints.MapEndpoints(app);
AgencyDashboardEndpoints.MapEndpoints(app);
GooglePlacesEndpoints.MapEndpoints(app);
EstablishmentEndpoints.MapEndpoints(app);
CompanyProfileEndpoints.MapEndpoints(app);
BillingClientEndpoints.MapEndpoints(app);
QuoteEndpoints.MapEndpoints(app);
InvoiceEndpoints.MapEndpoints(app);
AgencyStripeEndpoints.MapEndpoints(app);
InvoicePaymentEndpoints.MapEndpoints(app);
AgencyEmailEndpoints.MapEndpoints(app);
PackageOfferEndpoints.MapEndpoints(app);

// La route reste mappée même si le module est désactivé ; le handler vérifie l'état courant et
// renvoie 404 dynamiquement, pour qu'un toggle depuis l'admin du tenant prenne effet sans redémarrage.
ContactModule.MapEndpoints(app);
BlogModule.MapEndpoints(app);
BlogAdminEndpoints.MapEndpoints(app);
CatalogueModule.MapEndpoints(app);
CatalogueAdminEndpoints.MapEndpoints(app);
RdvModule.MapEndpoints(app);
RdvAdminEndpoints.MapEndpoints(app);
NewsletterModule.MapEndpoints(app);
NewsletterAdminEndpoints.MapEndpoints(app);
AvisGoogleModule.MapEndpoints(app);
AvisGoogleAdminEndpoints.MapEndpoints(app);
GalleryModule.MapEndpoints(app);
GalleryAdminEndpoints.MapEndpoints(app);
PagesModule.MapEndpoints(app);
PagesAdminEndpoints.MapEndpoints(app);
StripeModule.MapEndpoints(app);
StripeAdminEndpoints.MapEndpoints(app);
MultilingueAdminEndpoints.MapEndpoints(app);
CompteClientModule.MapEndpoints(app);

app.Run();
