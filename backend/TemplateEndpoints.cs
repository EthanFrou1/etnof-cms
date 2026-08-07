using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;

namespace Backend;

// Choix de mise en page du site public (voir frontend/src/templates/). Valeurs connues : "hestia",
// "helios". Lecture publique (le site en a besoin pour s'afficher), écriture protégée (le client
// choisit sa mise en page depuis son propre admin).
public static class TemplateEndpoints
{
    public static readonly string[] KnownTemplateIds = ["hestia", "helios"];

    // Variantes de couleurs disponibles par template, choisies par le client depuis son admin en
    // plus du template lui-même — voir frontend/src/templates/registry.ts pour le détail visuel
    // (labels, couleurs des pastilles) affiché dans l'admin, à tenir synchronisé avec cette liste
    // (mêmes id).
    public static readonly Dictionary<string, string[]> KnownPalettesByTemplate = new()
    {
        ["hestia"] = ["argile", "olivier", "egee"],
        ["helios"] = ["zenith", "aurore", "couchant"],
    };

    public static void MapEndpoints(WebApplication app)
    {
        app.MapGet("/api/t/{clientSiteId:guid}/template", async (Guid clientSiteId, AppDbContext db) =>
        {
            var site = await db.ClientSites
                .Where(c => c.Id == clientSiteId)
                .Select(c => new { c.TemplateId, c.PaletteId, c.CustomAccent })
                .FirstOrDefaultAsync();

            return site is null
                ? Results.NotFound()
                : Results.Ok(new { templateId = site.TemplateId, paletteId = site.PaletteId, customAccent = site.CustomAccent });
        });

        // Public : même contenu que /template mais figé à la dernière publication volontaire (voir
        // PublishEndpoints.cs, bouton "Rafraîchir le site"). Retombe sur le live tant qu'aucune
        // publication n'a encore eu lieu pour ce tenant, pour ne rien casser sur les sites existants.
        app.MapGet("/api/t/{clientSiteId:guid}/template/published", async (Guid clientSiteId, AppDbContext db) =>
        {
            var site = await db.ClientSites
                .Where(c => c.Id == clientSiteId)
                .Select(c => new
                {
                    c.TemplateId,
                    c.PaletteId,
                    c.CustomAccent,
                    c.PublishedAt,
                    c.PublishedTemplateId,
                    c.PublishedPaletteId,
                    c.PublishedCustomAccent,
                })
                .FirstOrDefaultAsync();
            if (site is null) return Results.NotFound();

            return site.PublishedAt is null
                ? Results.Ok(new { templateId = site.TemplateId, paletteId = site.PaletteId, customAccent = site.CustomAccent })
                : Results.Ok(new { templateId = site.PublishedTemplateId, paletteId = site.PublishedPaletteId, customAccent = site.PublishedCustomAccent });
        });

        app.MapPut("/api/t/{clientSiteId:guid}/admin/template", async (Guid clientSiteId, TemplateInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();
            if (!KnownTemplateIds.Contains(input.TemplateId)) return Results.BadRequest("Template inconnu.");

            // "custom" : couleur d'accent libre (color picker, voir SiteSection.tsx) plutôt qu'un des
            // presets de KnownPalettesByTemplate — validée par une regex hex plutôt que par la liste
            // de palettes connues.
            var isCustom = input.PaletteId == "custom";
            if (isCustom && (input.CustomAccent is null || !HexColorPattern.IsMatch(input.CustomAccent)))
            {
                return Results.BadRequest("Couleur personnalisée invalide (format hexadécimal attendu).");
            }

            var availablePalettes = KnownPalettesByTemplate.GetValueOrDefault(input.TemplateId, []);
            if (!isCustom && input.PaletteId is not null && availablePalettes.Length > 0 && !availablePalettes.Contains(input.PaletteId))
            {
                return Results.BadRequest("Palette inconnue pour ce template.");
            }

            var site = await db.ClientSites.FindAsync(clientSiteId);
            if (site is null) return Results.NotFound();

            site.TemplateId = input.TemplateId;
            if (isCustom)
            {
                site.PaletteId = "custom";
                site.CustomAccent = input.CustomAccent;
            }
            else if (input.PaletteId is not null && availablePalettes.Contains(input.PaletteId))
            {
                site.PaletteId = input.PaletteId;
            }
            else if (availablePalettes.Length > 0 && !availablePalettes.Contains(site.PaletteId) && site.PaletteId != "custom")
            {
                // Le tenant change de template et son ancienne palette n'existe pas pour le nouveau
                // (cas devenu rare, tous les templates ont désormais des palettes) : repli sur la première palette connue.
                site.PaletteId = availablePalettes[0];
            }

            await db.SaveChangesAsync();
            return Results.Ok(new { templateId = site.TemplateId, paletteId = site.PaletteId, customAccent = site.CustomAccent });
        });
    }

    private static readonly Regex HexColorPattern = new("^#[0-9a-fA-F]{6}$");
}

public record TemplateInput(string TemplateId, string? PaletteId = null, string? CustomAccent = null);
