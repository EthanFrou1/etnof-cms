using System.Text;
using Backend;
using Microsoft.EntityFrameworkCore;

namespace Modules.Newsletter;

// Endpoints admin du module newsletter (liste + export CSV) — même pattern d'auth que
// CatalogueAdminEndpoints.cs (mot de passe du tenant ou mot de passe agence).
public static class NewsletterAdminEndpoints
{
    public static void MapEndpoints(WebApplication app)
    {
        var group = app.MapGroup("/api/t/{clientSiteId:guid}/admin/newsletter");

        group.MapGet("/subscribers", async (Guid clientSiteId, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var subscribers = await db.NewsletterSubscribers
                .Where(s => s.ClientSiteId == clientSiteId)
                .OrderByDescending(s => s.CreatedAt)
                .ToListAsync();

            return Results.Ok(subscribers);
        });

        // Pas de librairie CSV ajoutée pour deux colonnes texte (règle 5 de CLAUDE.md) — un email
        // valide ne contient jamais de virgule ni de guillemet, donc pas d'échappement nécessaire ici.
        group.MapGet("/subscribers/export", async (Guid clientSiteId, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var subscribers = await db.NewsletterSubscribers
                .Where(s => s.ClientSiteId == clientSiteId)
                .OrderByDescending(s => s.CreatedAt)
                .ToListAsync();

            var csv = new StringBuilder("Email,Date d'inscription\n");
            foreach (var s in subscribers)
            {
                csv.AppendLine($"{s.Email},{s.CreatedAt:yyyy-MM-dd}");
            }

            var bytes = Encoding.UTF8.GetBytes(csv.ToString());
            return Results.File(bytes, "text/csv", "newsletter.csv");
        });
    }
}
