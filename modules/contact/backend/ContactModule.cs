using Backend;
using Microsoft.EntityFrameworkCore;

namespace Modules.Contact;

public static class ContactModule
{
    public const string Name = "contact";

    public static void MapEndpoints(WebApplication app)
    {
        // Le module peut être désactivé en direct depuis l'admin du tenant, sans redémarrage du
        // backend : la route reste mappée, mais renvoie 404 dès que le module est désactivé.
        app.MapPost("/api/t/{clientSiteId:guid}/contact", async (Guid clientSiteId, ContactMessageInput input, AppDbContext db, ModuleRegistry registry) =>
        {
            if (!await registry.IsEnabledAsync(clientSiteId, Name))
            {
                return Results.NotFound();
            }

            var message = new ContactMessage
            {
                Id = Guid.NewGuid(),
                ClientSiteId = clientSiteId,
                Name = input.Name,
                Email = input.Email,
                Message = input.Message,
                CreatedAt = DateTime.UtcNow,
            };

            db.ContactMessages.Add(message);
            await db.SaveChangesAsync();

            return Results.Created($"/api/t/{clientSiteId}/contact/{message.Id}", message);
        });

        // Liste des messages reçus, pour le panneau "Messages" de l'admin du tenant.
        app.MapGet("/api/t/{clientSiteId:guid}/admin/messages", async (Guid clientSiteId, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var messages = await db.ContactMessages
                .Where(m => m.ClientSiteId == clientSiteId)
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();

            return Results.Ok(messages);
        });
    }
}

public record ContactMessageInput(string Name, string Email, string Message);
