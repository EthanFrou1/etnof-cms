using System.Text.Json;

namespace Backend;

public class ModuleMeta
{
    public string Name { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<string> Dependencies { get; set; } = new();
}

// Lit /modules/*/module.meta.json pour donner un nom lisible aux modules dans l'admin. Ce fichier
// existait déjà pour chaque module (voir docs/02-architecture-modules.md) mais n'était lu par
// aucun code avant le bilan de la Phase 5.
public class ModuleMetaRegistry
{
    private readonly Dictionary<string, ModuleMeta> _byName;

    public ModuleMetaRegistry(IWebHostEnvironment env)
    {
        var modulesDir = Path.Combine(env.ContentRootPath, "..", "modules");
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };

        _byName = Directory.Exists(modulesDir)
            ? Directory.GetDirectories(modulesDir)
                .Select(dir => Path.Combine(dir, "module.meta.json"))
                .Where(File.Exists)
                .Select(path => JsonSerializer.Deserialize<ModuleMeta>(File.ReadAllText(path), options))
                .Where(meta => meta is not null)
                .ToDictionary(meta => meta!.Name, meta => meta!)
            : new Dictionary<string, ModuleMeta>();
    }

    public ModuleMeta? Get(string name) => _byName.GetValueOrDefault(name);

    // Tous les modules connus du socle (un module.meta.json par dossier sous /modules), utilisé
    // pour qu'un module ajouté après coup apparaisse dans l'admin de tous les tenants existants,
    // même ceux dont ModulesConfigJson ne contient pas encore sa clé.
    public IReadOnlyCollection<ModuleMeta> GetAll() => _byName.Values;
}
