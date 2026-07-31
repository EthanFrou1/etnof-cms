using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;

namespace Backend;

// Admin d'UN tenant précis (contenu + toggle modules) — pas à confondre avec AgencyDashboardEndpoints
// (vue globale d'Ethan sur tous les tenants, mot de passe agence uniquement).
public static class TenantAdminEndpoints
{
    public static void MapEndpoints(WebApplication app)
    {
        app.MapPost("/api/t/{clientSiteId:guid}/admin/login", async (Guid clientSiteId, AdminLoginInput input, IConfiguration config, AppDbContext db) =>
        {
            string token;
            if (AdminPasswordHasher.Verify(input.Password, config["Admin:PasswordHash"]))
            {
                token = AdminToken.Issue(config, "agency");
            }
            else
            {
                var tenantHash = await db.ClientSites
                    .Where(c => c.Id == clientSiteId)
                    .Select(c => c.PasswordHash)
                    .FirstOrDefaultAsync();

                if (!AdminPasswordHasher.Verify(input.Password, tenantHash)) return Results.Unauthorized();
                token = AdminToken.Issue(config, "tenant", clientSiteId);
            }

            return Results.Ok(new { token, expiresAt = AdminToken.ExpiresAtUnixSeconds(token) });
        }).RequireRateLimiting("login");

        app.MapGet("/api/t/{clientSiteId:guid}/admin/modules", async (Guid clientSiteId, HttpRequest req, IConfiguration config, AppDbContext db, ModuleRegistry registry, ModuleMetaRegistry metaRegistry) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var modules = await registry.GetModulesAsync(clientSiteId);
            var prices = await db.ModulePrices.ToDictionaryAsync(p => p.ModuleName, p => p.Price);
            var result = new JsonObject();

            // Union avec tous les modules connus du socle (module.meta.json) : un module ajouté
            // après coup doit apparaître ici (désactivé par défaut) même si ModulesConfigJson ne
            // contient pas encore sa clé pour ce tenant.
            var allNames = modules.Keys.Concat(metaRegistry.GetAll().Select(m => m.Name)).Distinct();

            foreach (var name in allNames)
            {
                var node = modules.TryGetValue(name, out var element)
                    ? JsonNode.Parse(element.GetRawText())!.AsObject()
                    : new JsonObject { ["enabled"] = false };
                var meta = metaRegistry.Get(name);
                node["displayName"] = meta?.DisplayName ?? name;
                node["description"] = meta?.Description ?? "";
                // Autorisation décidée par l'agence (voir ModuleRegistry.IsAuthorized) : le client
                // ne peut activer/désactiver que ce qu'Ethan lui a autorisé.
                node["authorized"] = ModuleRegistry.IsAuthorized(modules, name);
                // Affiché sur la card d'un module non autorisé ("Activer pour {price}"), éditable
                // depuis le dashboard agence — voir AgencyDashboardEndpoints.MapPut("/price").
                node["price"] = prices.GetValueOrDefault(name, "");
                result[name] = node;
            }

            return Results.Ok(result);
        });

        app.MapPut("/api/t/{clientSiteId:guid}/admin/modules/{name}", async (Guid clientSiteId, string name, ToggleModuleInput input, HttpRequest req, IConfiguration config, AppDbContext db, ModuleRegistry registry) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            if (!await registry.IsAuthorizedAsync(clientSiteId, name))
            {
                return Results.Json(new { error = "Module non autorisé par l'agence." }, statusCode: StatusCodes.Status403Forbidden);
            }

            return await registry.SetEnabledAsync(clientSiteId, name, input.Enabled) ? Results.Ok() : Results.NotFound();
        });

        // Champs de config libres d'un module (ex. address/apiKey de maps) — voir ModuleCard dans
        // ModulesSection.tsx et docs/02-architecture-modules.md.
        app.MapPut("/api/t/{clientSiteId:guid}/admin/modules/{name}/config", async (Guid clientSiteId, string name, Dictionary<string, string> fields, HttpRequest req, IConfiguration config, AppDbContext db, ModuleRegistry registry) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            if (!await registry.IsAuthorizedAsync(clientSiteId, name))
            {
                return Results.Json(new { error = "Module non autorisé par l'agence." }, statusCode: StatusCodes.Status403Forbidden);
            }

            return await registry.SetFieldsAsync(clientSiteId, name, fields) ? Results.Ok() : Results.NotFound();
        });

        // Bulle d'aide de l'admin client (SupportBubble.tsx, visible sur toutes les pages via
        // AdminLayout.tsx) — envoie un email réel à l'agence via Brevo, pas juste un mailto:.
        app.MapPost("/api/t/{clientSiteId:guid}/admin/support", async (
            Guid clientSiteId, SupportRequestInput input, HttpRequest req, IConfiguration config, AppDbContext db, IHttpClientFactory httpFactory) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();
            if (string.IsNullOrWhiteSpace(input.Message)) return Results.BadRequest("Message vide.");

            var siteName = await db.ClientSites
                .Where(c => c.Id == clientSiteId)
                .Select(c => c.Name)
                .FirstOrDefaultAsync();
            if (siteName is null) return Results.NotFound();

            var emailSettings = await AgencyEmailEndpoints.GetOrCreateAsync(db);
            if (string.IsNullOrWhiteSpace(emailSettings.BrevoApiKey))
            {
                return Results.BadRequest("Envoi indisponible pour le moment.");
            }

            var http = httpFactory.CreateClient();
            var sent = await BrevoEmailService.SendSupportRequestAsync(
                http, emailSettings.BrevoApiKey, siteName, clientSiteId, input.Message, input.ReplyToEmail);

            return sent ? Results.Ok(new { sent = true }) : Results.Json(new { error = "Envoi indisponible pour le moment." }, statusCode: StatusCodes.Status500InternalServerError);
        });
    }
}

public record AdminLoginInput(string Password);
public record ToggleModuleInput(bool Enabled);
public record SupportRequestInput(string Message, string? ReplyToEmail);
