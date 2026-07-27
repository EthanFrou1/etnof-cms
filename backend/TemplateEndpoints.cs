using Microsoft.EntityFrameworkCore;

namespace Backend;

// Choix de mise en page du site public (voir frontend/src/templates/). Valeurs connues : "hestia",
// "moderne". Lecture publique (le site en a besoin pour s'afficher), écriture protégée (le client
// choisit sa mise en page depuis son propre admin).
public static class TemplateEndpoints
{
    public static readonly string[] KnownTemplateIds = ["hestia", "moderne"];

    // Variantes de couleurs disponibles par template, choisies par le client depuis son admin en
    // plus du template lui-même — voir frontend/src/templates/registry.ts pour le détail visuel
    // (labels, couleurs des pastilles) affiché dans l'admin, à tenir synchronisé avec cette liste
    // (mêmes id). Un template pas encore listé ici (ex. "moderne", pas encore repris) a une liste
    // vide : PaletteId n'est alors ni proposé dans l'admin ni utilisé par le rendu.
    public static readonly Dictionary<string, string[]> KnownPalettesByTemplate = new()
    {
        ["hestia"] = ["argile", "olivier", "egee"],
        ["moderne"] = [],
    };

    public static void MapEndpoints(WebApplication app)
    {
        app.MapGet("/api/t/{clientSiteId:guid}/template", async (Guid clientSiteId, AppDbContext db) =>
        {
            var site = await db.ClientSites
                .Where(c => c.Id == clientSiteId)
                .Select(c => new { c.TemplateId, c.PaletteId })
                .FirstOrDefaultAsync();

            return site is null ? Results.NotFound() : Results.Ok(new { templateId = site.TemplateId, paletteId = site.PaletteId });
        });

        app.MapPut("/api/t/{clientSiteId:guid}/admin/template", async (Guid clientSiteId, TemplateInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();
            if (!KnownTemplateIds.Contains(input.TemplateId)) return Results.BadRequest("Template inconnu.");

            var availablePalettes = KnownPalettesByTemplate.GetValueOrDefault(input.TemplateId, []);
            if (input.PaletteId is not null && availablePalettes.Length > 0 && !availablePalettes.Contains(input.PaletteId))
            {
                return Results.BadRequest("Palette inconnue pour ce template.");
            }

            var site = await db.ClientSites.FindAsync(clientSiteId);
            if (site is null) return Results.NotFound();

            site.TemplateId = input.TemplateId;
            if (input.PaletteId is not null && availablePalettes.Contains(input.PaletteId))
            {
                site.PaletteId = input.PaletteId;
            }
            else if (availablePalettes.Length > 0 && !availablePalettes.Contains(site.PaletteId))
            {
                // Le tenant change de template et son ancienne palette n'existe pas pour le nouveau
                // (ex. venait de "moderne", sans palette) : repli sur la première palette connue.
                site.PaletteId = availablePalettes[0];
            }

            await db.SaveChangesAsync();
            return Results.Ok(new { templateId = site.TemplateId, paletteId = site.PaletteId });
        });
    }
}

public record TemplateInput(string TemplateId, string? PaletteId = null);
