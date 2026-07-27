using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;

namespace Backend;

// Vue globale agence : catalogue des tenants (sites clients) + stats agrégées, réservé à Ethan
// (mot de passe agence, AdminAuth). Isolé des endpoints livrés aux clients (contact, maps, blog...)
// — voir docs/07-admin-global.md.
public static class AgencyDashboardEndpoints
{
    public static void MapEndpoints(WebApplication app)
    {
        app.MapPost("/api/admin/login", (AdminLoginInput input, IConfiguration config) =>
            AdminPasswordHasher.Verify(input.Password, config["Admin:PasswordHash"]) ? Results.Ok() : Results.Unauthorized());

        app.MapGet("/api/admin/client-sites", async (HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();
            var sites = await db.ClientSites.OrderByDescending(s => s.CreatedAt).ToListAsync();
            return Results.Ok(sites.Select(ToPublicShape));
        });

        // Tous les modules connus du socle (un module.meta.json par dossier sous /modules), pour
        // que le formulaire "Modules autorisés" du dashboard agence liste dynamiquement tous les
        // modules existants — avant ce fix, la liste était codée en dur côté frontend et n'incluait
        // jamais les modules ajoutés après coup (ex. Catalogue). Inclut le prix (éditable ci-dessous)
        // affiché aux clients sur les modules qu'ils n'ont pas encore.
        app.MapGet("/api/admin/modules", async (HttpRequest req, IConfiguration config, ModuleMetaRegistry metaRegistry, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();

            var prices = await db.ModulePrices.ToDictionaryAsync(p => p.ModuleName, p => p.Price);
            var modules = metaRegistry.GetAll().Select(m => new
            {
                m.Name,
                m.DisplayName,
                Price = prices.GetValueOrDefault(m.Name, ""),
            });

            return Results.Ok(modules);
        });

        app.MapPut("/api/admin/modules/{name}/price", async (string name, ModulePriceInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();

            var price = await db.ModulePrices.FindAsync(name);
            if (price is null)
            {
                price = new ModulePrice { ModuleName = name };
                db.ModulePrices.Add(price);
            }
            price.Price = input.Price;
            await db.SaveChangesAsync();

            return Results.Ok(price);
        });

        app.MapPost("/api/admin/client-sites", async (ClientSiteInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();
            if (string.IsNullOrWhiteSpace(input.Password)) return Results.BadRequest("Un mot de passe est requis à la création.");

            var site = new ClientSite
            {
                Id = Guid.NewGuid(),
                Name = input.Name,
                SiteType = input.SiteType,
                Description = input.Description,
                Url = input.Url,
                Status = input.Status,
                PasswordHash = AdminPasswordHasher.Hash(input.Password),
                ModulesConfigJson = BuildModulesConfigJson(null, input.Modules),
                TemplateId = TemplateEndpoints.KnownTemplateIds.Contains(input.TemplateId) ? input.TemplateId : "hestia",
                CreatedAt = DateTime.UtcNow,
            };

            db.ClientSites.Add(site);
            db.SiteContents.Add(new SiteContent
            {
                Id = Guid.NewGuid(),
                ClientSiteId = site.Id,
                SiteName = input.Name,
                Description = string.Empty,
                Offers = new List<Offer>(),
            });

            await db.SaveChangesAsync();
            return Results.Created($"/api/admin/client-sites/{site.Id}", ToPublicShape(site));
        });

        app.MapPut("/api/admin/client-sites/{id:guid}", async (Guid id, ClientSiteInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();

            var site = await db.ClientSites.FindAsync(id);
            if (site is null) return Results.NotFound();

            site.Name = input.Name;
            site.SiteType = input.SiteType;
            site.Description = input.Description;
            site.Url = input.Url;
            site.Status = input.Status;
            site.ModulesConfigJson = BuildModulesConfigJson(site.ModulesConfigJson, input.Modules);
            if (TemplateEndpoints.KnownTemplateIds.Contains(input.TemplateId))
            {
                site.TemplateId = input.TemplateId;
            }

            // Le mot de passe n'est changé que si un nouveau est fourni (jamais renvoyé en clair).
            if (!string.IsNullOrWhiteSpace(input.Password))
            {
                site.PasswordHash = AdminPasswordHasher.Hash(input.Password);
            }

            await db.SaveChangesAsync();
            return Results.Ok(ToPublicShape(site));
        });

        app.MapDelete("/api/admin/client-sites/{id:guid}", async (Guid id, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();

            var site = await db.ClientSites.FindAsync(id);
            if (site is null) return Results.NotFound();

            db.ClientSites.Remove(site);
            await db.SaveChangesAsync();
            return Results.Ok();
        });

        app.MapGet("/api/admin/stats", async (HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();

            var sites = await db.ClientSites.ToListAsync();

            var byStatus = sites
                .GroupBy(s => s.Status)
                .ToDictionary(g => g.Key, g => g.Count());

            var byType = sites
                .GroupBy(s => string.IsNullOrWhiteSpace(s.SiteType) ? "Non renseigné" : s.SiteType)
                .ToDictionary(g => g.Key, g => g.Count());

            var byModule = sites
                .SelectMany(s => GetAuthorizedModuleNames(s.ModulesConfigJson))
                .GroupBy(m => m)
                .ToDictionary(g => g.Key, g => g.Count());

            return Results.Ok(new
            {
                totalSites = sites.Count,
                byStatus,
                byType,
                byModule,
            });
        });
    }

    // Ne renvoie jamais le hash du mot de passe au client HTTP. "Modules" reflète les modules
    // AUTORISÉS par l'agence (pas juste ceux actuellement affichés côté client) : sert à la fois à
    // pré-remplir le formulaire d'édition et au graphique "Modules utilisés" du dashboard.
    private static object ToPublicShape(ClientSite site) => new
    {
        site.Id,
        site.Name,
        site.SiteType,
        site.Description,
        site.Url,
        site.Status,
        Modules = GetAuthorizedModuleNames(site.ModulesConfigJson),
        site.TemplateId,
        site.CreatedAt,
    };

    // Même règle de rétrocompatibilité que ModuleRegistry.IsAuthorized : un module déjà présent
    // sans champ "authorized" explicite est considéré autorisé (configs créées avant ce champ).
    private static List<string> GetAuthorizedModuleNames(string modulesConfigJson)
    {
        if (string.IsNullOrWhiteSpace(modulesConfigJson)) return new();
        if (JsonNode.Parse(modulesConfigJson) is not JsonObject root) return new();

        return root
            .Where(kv => kv.Value is JsonObject obj && (obj["authorized"] is null || obj["authorized"]!.GetValue<bool>()))
            .Select(kv => kv.Key)
            .ToList();
    }

    // Le tableau coché dans le formulaire agence = les modules AUTORISÉS pour ce client (pas
    // "actifs" au sens où le client les afficherait forcément). Autoriser active aussi
    // immédiatement (décision produit d'Ethan) ; révoquer désactive aussi, pour ne pas laisser une
    // case cochée dans l'admin du client sur un module qu'il ne contrôle plus.
    private static string BuildModulesConfigJson(string? existingJson, List<string> authorizedModules)
    {
        var root = (string.IsNullOrWhiteSpace(existingJson) ? null : JsonNode.Parse(existingJson) as JsonObject) ?? new JsonObject();

        foreach (var name in authorizedModules)
        {
            if (root[name] is not JsonObject moduleNode)
            {
                moduleNode = new JsonObject();
                root[name] = moduleNode;
            }
            moduleNode["authorized"] = true;
            moduleNode["enabled"] = true;
        }

        foreach (var (key, value) in root.ToList())
        {
            if (value is JsonObject existingModule && !authorizedModules.Contains(key))
            {
                existingModule["authorized"] = false;
                existingModule["enabled"] = false;
            }
        }

        return root.ToJsonString();
    }
}

public record ModulePriceInput(string Price);

public record ClientSiteInput(
    string Name,
    string SiteType,
    string Description,
    string Url,
    string Status,
    List<string> Modules,
    string? Password,
    string TemplateId
);
