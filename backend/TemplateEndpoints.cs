using Microsoft.EntityFrameworkCore;

namespace Backend;

// Choix de mise en page du site public (voir frontend/src/templates/). Valeurs connues : "classique",
// "moderne". Lecture publique (le site en a besoin pour s'afficher), écriture protégée (le client
// choisit sa mise en page depuis son propre admin).
public static class TemplateEndpoints
{
    public static readonly string[] KnownTemplateIds = ["classique", "moderne"];

    public static void MapEndpoints(WebApplication app)
    {
        app.MapGet("/api/t/{clientSiteId:guid}/template", async (Guid clientSiteId, AppDbContext db) =>
        {
            var templateId = await db.ClientSites
                .Where(c => c.Id == clientSiteId)
                .Select(c => c.TemplateId)
                .FirstOrDefaultAsync();

            return templateId is null ? Results.NotFound() : Results.Ok(new { templateId });
        });

        app.MapPut("/api/t/{clientSiteId:guid}/admin/template", async (Guid clientSiteId, TemplateInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();
            if (!KnownTemplateIds.Contains(input.TemplateId)) return Results.BadRequest("Template inconnu.");

            var site = await db.ClientSites.FindAsync(clientSiteId);
            if (site is null) return Results.NotFound();

            site.TemplateId = input.TemplateId;
            await db.SaveChangesAsync();
            return Results.Ok(new { templateId = site.TemplateId });
        });
    }
}

public record TemplateInput(string TemplateId);
