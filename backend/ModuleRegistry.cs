using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;

namespace Backend;

// Multi-tenant : chaque ClientSite porte sa propre config de modules (ModulesConfigJson), plus de
// fichier site.config.json global. Service scoped (dépend d'AppDbContext), les méthodes prennent
// le tenant visé en paramètre — voir le plan de passage en multi-tenant (2026-07-26).
public class ModuleRegistry
{
    private readonly AppDbContext _db;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public ModuleRegistry(AppDbContext db)
    {
        _db = db;
    }

    public async Task<Dictionary<string, JsonElement>> GetModulesAsync(Guid clientSiteId)
    {
        var json = await _db.ClientSites
            .Where(c => c.Id == clientSiteId)
            .Select(c => c.ModulesConfigJson)
            .FirstOrDefaultAsync();

        if (string.IsNullOrWhiteSpace(json)) return new();

        return JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json, JsonOptions) ?? new();
    }

    public async Task<bool> IsEnabledAsync(Guid clientSiteId, string moduleName)
    {
        var modules = await GetModulesAsync(clientSiteId);
        return IsAuthorized(modules, moduleName)
            && modules.TryGetValue(moduleName, out var module)
            && module.TryGetProperty("enabled", out var enabled)
            && enabled.GetBoolean();
    }

    // Autorisation (décision d'Ethan, agence) : distincte de l'activation (décision du client). Un
    // module non autorisé reste injoignable même si le client tente de l'activer lui-même — voir
    // docs/02-architecture-modules.md. Rétrocompat : un module déjà présent dans ModulesConfigJson
    // mais sans champ "authorized" explicite (configs créées avant l'ajout de ce champ) est traité
    // comme autorisé ; un module absent du JSON (jamais touché par Ethan) ne l'est pas.
    // internal (pas private) : réutilisée telle quelle par TenantAdminEndpoints pour exposer le
    // champ "authorized" dans la réponse de GET /admin/modules, sans dupliquer la règle.
    internal static bool IsAuthorized(Dictionary<string, JsonElement> modules, string moduleName)
    {
        if (!modules.TryGetValue(moduleName, out var module)) return false;
        return !module.TryGetProperty("authorized", out var authorized) || authorized.GetBoolean();
    }

    public async Task<bool> IsAuthorizedAsync(Guid clientSiteId, string moduleName)
    {
        var modules = await GetModulesAsync(clientSiteId);
        return IsAuthorized(modules, moduleName);
    }

    /// Modifie uniquement le champ "enabled" du module visé (préserve les autres champs, ex.
    /// address/apiKey de maps). Réservé au client : refuse si le module n'est pas autorisé par
    /// l'agence, quelle que soit la valeur demandée.
    public async Task<bool> SetEnabledAsync(Guid clientSiteId, string moduleName, bool enabled)
    {
        if (!await IsAuthorizedAsync(clientSiteId, moduleName)) return false;

        var site = await _db.ClientSites.FindAsync(clientSiteId);
        if (site is null) return false;

        var node = (string.IsNullOrWhiteSpace(site.ModulesConfigJson)
            ? new JsonObject()
            : JsonNode.Parse(site.ModulesConfigJson) as JsonObject) ?? new JsonObject();

        if (node[moduleName] is not JsonObject moduleNode)
        {
            moduleNode = new JsonObject();
            node[moduleName] = moduleNode;
        }
        moduleNode["enabled"] = enabled;

        site.ModulesConfigJson = node.ToJsonString();
        await _db.SaveChangesAsync();
        return true;
    }

    /// Réservé à l'agence (appelé depuis AgencyDashboardEndpoints, jamais depuis l'admin d'un
    /// tenant). Autoriser un module l'active aussi immédiatement (décision produit d'Ethan) ; le
    /// révoquer le désactive aussi, pour ne pas laisser une case cochée que le client ne contrôle
    /// plus dans son propre admin.
    public async Task<bool> SetAuthorizedAsync(Guid clientSiteId, string moduleName, bool authorized)
    {
        var site = await _db.ClientSites.FindAsync(clientSiteId);
        if (site is null) return false;

        var node = (string.IsNullOrWhiteSpace(site.ModulesConfigJson)
            ? new JsonObject()
            : JsonNode.Parse(site.ModulesConfigJson) as JsonObject) ?? new JsonObject();

        if (node[moduleName] is not JsonObject moduleNode)
        {
            moduleNode = new JsonObject();
            node[moduleName] = moduleNode;
        }
        moduleNode["authorized"] = authorized;
        moduleNode["enabled"] = authorized;

        site.ModulesConfigJson = node.ToJsonString();
        await _db.SaveChangesAsync();
        return true;
    }

    /// Modifie des champs de config libres du module (ex. address/apiKey de maps), sans toucher à
    /// enabled/authorized. Réservé au client, mêmes règles d'autorisation que SetEnabledAsync.
    public async Task<bool> SetFieldsAsync(Guid clientSiteId, string moduleName, Dictionary<string, string> fields)
    {
        if (!await IsAuthorizedAsync(clientSiteId, moduleName)) return false;

        var site = await _db.ClientSites.FindAsync(clientSiteId);
        if (site is null) return false;

        var node = (string.IsNullOrWhiteSpace(site.ModulesConfigJson)
            ? new JsonObject()
            : JsonNode.Parse(site.ModulesConfigJson) as JsonObject) ?? new JsonObject();

        if (node[moduleName] is not JsonObject moduleNode)
        {
            moduleNode = new JsonObject();
            node[moduleName] = moduleNode;
        }

        foreach (var (key, value) in fields)
        {
            moduleNode[key] = value;
        }

        site.ModulesConfigJson = node.ToJsonString();
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<string>> GetAuthorizedModuleNamesAsync(Guid clientSiteId)
    {
        var modules = await GetModulesAsync(clientSiteId);
        return modules.Keys.Where(name => IsAuthorized(modules, name)).ToList();
    }
}
