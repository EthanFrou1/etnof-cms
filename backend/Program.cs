using System.Threading.RateLimiting;
using Backend;
using Microsoft.EntityFrameworkCore;
using Modules.AvisGoogle;
using Modules.Blog;
using Modules.Catalogue;
using Modules.CompteClient;
using Modules.Contact;
using Modules.Fidelite;
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

// Historique des actions admin (voir AdminActionLog.cs) — capture générique de toute écriture
// (POST/PUT/DELETE) réussie sous /api/t/{clientSiteId}/admin/..., quel que soit l'endpoint. La
// connexion elle-même (POST .../admin/login) n'a pas d'en-tête Authorization sur sa requête —
// loguée à la main dans TenantAdminEndpoints.cs une fois le token émis, pas ici.
app.Use(async (context, next) =>
{
    var match = AdminActionLogger.MatchTenantAdminPath(context.Request.Path.Value ?? "");
    var isWrite = context.Request.Method is "POST" or "PUT" or "DELETE";

    await next();

    if (match is null || !isWrite) return;
    if (context.Response.StatusCode < 200 || context.Response.StatusCode >= 300) return;

    var db = context.RequestServices.GetRequiredService<AppDbContext>();
    var config = context.RequestServices.GetRequiredService<IConfiguration>();
    var actor = await AdminActionLogger.ResolveActorAsync(db, config, context.Request);
    if (actor is null) return;

    await AdminActionLogger.LogAsync(
        db, match.Value.ClientSiteId, actor.Value.ActorType, actor.Value.ActorLabel,
        context.Request.Method, context.Request.Path.Value ?? "",
        AdminActionLogger.DescribeAction(context.Request.Method, match.Value.PathTail),
        context.Response.StatusCode);
});

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
SeoEndpoints.MapEndpoints(app);
AdminTokenEndpoints.MapEndpoints(app);
DomainEndpoints.MapEndpoints(app);

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
FideliteModule.MapEndpoints(app);

app.Run();
