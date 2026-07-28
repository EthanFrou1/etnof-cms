using Backend;
using Microsoft.EntityFrameworkCore;
using Modules.AvisGoogle;
using Modules.Blog;
using Modules.Catalogue;
using Modules.Contact;
using Modules.Newsletter;
using Modules.Rdv;

// Utilitaire CLI : `dotnet run -- hash-password <mot-de-passe>` génère un hash à coller dans
// Admin:PasswordHash ou le mot de passe d'un tenant. Voir DEMARRAGE.md.
if (args.Length == 2 && args[0] == "hash-password")
{
    Console.WriteLine(AdminPasswordHasher.Hash(args[1]));
    return;
}

var builder = WebApplication.CreateBuilder(args);

// Scoped (pas Singleton) : ModuleRegistry dépend d'AppDbContext, qui est scoped par requête —
// chaque module est maintenant configuré par tenant, plus de fichier global (voir ModuleRegistry.cs).
builder.Services.AddScoped<ModuleRegistry>();
builder.Services.AddSingleton<ModuleMetaRegistry>();
builder.Services.AddHttpClient();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

var allowedOrigin = builder.Configuration["Cors:AllowedOrigin"] ?? "http://localhost:5173";
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(allowedOrigin).AllowAnyMethod().AllowAnyHeader());
});

var app = builder.Build();

app.UseCors();

// Sert les photos produits uploadées (backend/wwwroot/uploads/{clientSiteId}/{productId}/...).
app.UseStaticFiles();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));

// Public : config des modules d'UN tenant (utilisé par useModules() côté frontend).
app.MapGet("/api/t/{clientSiteId:guid}/config/modules", async (Guid clientSiteId, ModuleRegistry registry) =>
    Results.Ok(await registry.GetModulesAsync(clientSiteId)));

ContentEndpoints.MapEndpoints(app);
TenantAdminEndpoints.MapEndpoints(app);
TemplateEndpoints.MapEndpoints(app);
AgencyDashboardEndpoints.MapEndpoints(app);
GooglePlacesEndpoints.MapEndpoints(app);
EstablishmentEndpoints.MapEndpoints(app);

// La route reste mappée même si le module est désactivé ; le handler vérifie l'état courant et
// renvoie 404 dynamiquement, pour qu'un toggle depuis l'admin du tenant prenne effet sans redémarrage.
ContactModule.MapEndpoints(app);
BlogModule.MapEndpoints(app);
CatalogueModule.MapEndpoints(app);
CatalogueAdminEndpoints.MapEndpoints(app);
RdvModule.MapEndpoints(app);
RdvAdminEndpoints.MapEndpoints(app);
NewsletterModule.MapEndpoints(app);
NewsletterAdminEndpoints.MapEndpoints(app);
AvisGoogleModule.MapEndpoints(app);
AvisGoogleAdminEndpoints.MapEndpoints(app);

app.Run();
