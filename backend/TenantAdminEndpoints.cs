using System.Security.Cryptography;
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
            string scope;
            Guid? accountId = null;
            if (AdminPasswordHasher.Verify(input.Password, config["Admin:PasswordHash"]))
            {
                scope = "agency";
                token = AdminToken.Issue(config, scope);
            }
            else if (!string.IsNullOrWhiteSpace(input.Email))
            {
                // Compte "Employé" (TenantAdminAccount) — email requis, contrairement au mot de passe
                // unique du Propriétaire ci-dessous qui n'en a pas. Voir TenantAdminAuth pour la
                // portée réduite du scope "tenant-employee" qui en résulte.
                var email = input.Email.Trim().ToLowerInvariant();
                var account = await db.TenantAdminAccounts
                    .FirstOrDefaultAsync(a => a.ClientSiteId == clientSiteId && a.Email.ToLower() == email);

                if (account is null || !AdminPasswordHasher.Verify(input.Password, account.PasswordHash)) return Results.Unauthorized();
                scope = "tenant-employee";
                accountId = account.Id;
                token = AdminToken.Issue(config, scope, clientSiteId, accountId);
            }
            else
            {
                var tenantHash = await db.ClientSites
                    .Where(c => c.Id == clientSiteId)
                    .Select(c => c.PasswordHash)
                    .FirstOrDefaultAsync();

                if (!AdminPasswordHasher.Verify(input.Password, tenantHash)) return Results.Unauthorized();
                scope = "tenant";
                token = AdminToken.Issue(config, scope, clientSiteId);
            }

            // Loguée à la main (pas via le middleware générique, voir Program.cs) : la requête de
            // login n'a pas d'en-tête Authorization, l'auteur n'est connu qu'une fois le token émis.
            var actor = await AdminActionLogger.ResolveActorAsync(db, scope, accountId);
            if (actor is not null)
            {
                await AdminActionLogger.LogAsync(db, clientSiteId, actor.Value.ActorType, actor.Value.ActorLabel, "POST", $"/api/t/{clientSiteId}/admin/login", "Connexion", 200);
            }

            return Results.Ok(new { token, expiresAt = AdminToken.ExpiresAtUnixSeconds(token) });
        }).RequireRateLimiting("login");

        app.MapGet("/api/t/{clientSiteId:guid}/admin/modules", async (Guid clientSiteId, HttpRequest req, IConfiguration config, ModuleRegistry registry, ModuleMetaRegistry metaRegistry, AppDbContext db) =>
        {
            // Owner-only : un compte Employé n'a pas accès à la page Modules (active/désactive des
            // fonctionnalités payantes) — voir TenantAdminAuth.IsOwnerAuthorizedAsync.
            if (!await TenantAdminAuth.IsOwnerAuthorizedAsync(req, config, clientSiteId)) return Results.Unauthorized();

            var modules = await registry.GetModulesAsync(clientSiteId);
            var prices = await db.ModulePrices.ToDictionaryAsync(p => p.ModuleName);
            var result = new JsonObject();

            // Union avec tous les modules connus du socle (module.meta.json) : un module ajouté
            // après coup doit apparaître ici (désactivé par défaut) même si ModulesConfigJson ne
            // contient pas encore sa clé pour ce tenant.
            var allNames = modules.Keys.Concat(metaRegistry.GetAll().Select(m => m.Name)).Distinct();

            foreach (var name in allNames)
            {
                var authorized = ModuleRegistry.IsAuthorized(modules, name);
                prices.TryGetValue(name, out var price);

                // Visibilité globale du catalogue (voir ModulePrice.Visible) : un module masqué par
                // Ethan disparaît du catalogue de tous les clients, sauf ceux pour qui il l'a
                // explicitement autorisé (sinon un client déjà autorisé le perdrait de son admin).
                if (!authorized && price?.Visible == false) continue;

                var node = modules.TryGetValue(name, out var element)
                    ? JsonNode.Parse(element.GetRawText())!.AsObject()
                    : new JsonObject { ["enabled"] = false };
                var meta = metaRegistry.Get(name);
                node["displayName"] = meta?.DisplayName ?? name;
                node["description"] = meta?.Description ?? "";
                // Autorisation décidée par l'agence (voir ModuleRegistry.IsAuthorized) : le client
                // ne peut activer/désactiver que ce qu'Ethan lui a autorisé.
                node["authorized"] = authorized;
                // Affiché sur la card d'un module non autorisé ("Activer pour {price}"), éditable
                // depuis le dashboard agence — voir AgencyDashboardEndpoints.MapPut("/price").
                node["price"] = price?.Price ?? "";
                result[name] = node;
            }

            return Results.Ok(result);
        });

        app.MapPut("/api/t/{clientSiteId:guid}/admin/modules/{name}", async (Guid clientSiteId, string name, ToggleModuleInput input, HttpRequest req, IConfiguration config, AppDbContext db, ModuleRegistry registry) =>
        {
            if (!await TenantAdminAuth.IsOwnerAuthorizedAsync(req, config, clientSiteId)) return Results.Unauthorized();

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
            if (!await TenantAdminAuth.IsOwnerAuthorizedAsync(req, config, clientSiteId)) return Results.Unauthorized();

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

        // Comptes "Employé" (TenantAdminAccount) — CRUD réservé au Propriétaire (+ agence), voir
        // TenantAdminAuth.IsOwnerAuthorizedAsync. Le mot de passe n'est jamais renvoyé, même haché —
        // et n'est de toute façon jamais choisi par le Propriétaire (voir SendInviteAsync ci-dessous).
        app.MapGet("/api/t/{clientSiteId:guid}/admin/accounts", async (Guid clientSiteId, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsOwnerAuthorizedAsync(req, config, clientSiteId)) return Results.Unauthorized();

            var accounts = await db.TenantAdminAccounts
                .Where(a => a.ClientSiteId == clientSiteId)
                .OrderBy(a => a.CreatedAt)
                .Select(a => new { a.Id, a.FirstName, a.LastName, a.Email, a.Phone, a.ActivatedAt, a.CreatedAt })
                .ToListAsync();

            return Results.Ok(accounts);
        });

        app.MapPost("/api/t/{clientSiteId:guid}/admin/accounts", async (
            Guid clientSiteId, TenantAccountInput input, HttpRequest req, IConfiguration config, AppDbContext db, IHttpClientFactory httpFactory) =>
        {
            if (!await TenantAdminAuth.IsOwnerAuthorizedAsync(req, config, clientSiteId)) return Results.Unauthorized();

            var firstName = input.FirstName.Trim();
            var lastName = input.LastName.Trim();
            var email = input.Email.Trim().ToLowerInvariant();
            if (firstName.Length == 0 || lastName.Length == 0 || email.Length == 0)
            {
                return Results.BadRequest(new { error = "Prénom, nom et email requis." });
            }

            var emailTaken = await db.TenantAdminAccounts.AnyAsync(a => a.ClientSiteId == clientSiteId && a.Email.ToLower() == email);
            if (emailTaken) return Results.BadRequest(new { error = "Un compte existe déjà avec cet email." });

            var account = new TenantAdminAccount
            {
                Id = Guid.NewGuid(),
                ClientSiteId = clientSiteId,
                FirstName = firstName,
                LastName = lastName,
                Email = email,
                Phone = input.Phone?.Trim() ?? "",
                CreatedAt = DateTime.UtcNow,
            };
            db.TenantAdminAccounts.Add(account);
            await db.SaveChangesAsync();

            await SendInviteAsync(db, httpFactory, config, clientSiteId, account);

            return Results.Created($"/api/t/{clientSiteId}/admin/accounts/{account.Id}",
                new { account.Id, account.FirstName, account.LastName, account.Email, account.Phone, account.ActivatedAt, account.CreatedAt });
        });

        app.MapPut("/api/t/{clientSiteId:guid}/admin/accounts/{id:guid}", async (Guid clientSiteId, Guid id, TenantAccountInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsOwnerAuthorizedAsync(req, config, clientSiteId)) return Results.Unauthorized();

            var account = await db.TenantAdminAccounts.FirstOrDefaultAsync(a => a.Id == id && a.ClientSiteId == clientSiteId);
            if (account is null) return Results.NotFound();

            var firstName = input.FirstName.Trim();
            var lastName = input.LastName.Trim();
            var email = input.Email.Trim().ToLowerInvariant();
            if (firstName.Length == 0 || lastName.Length == 0 || email.Length == 0)
            {
                return Results.BadRequest(new { error = "Prénom, nom et email requis." });
            }

            var emailTaken = await db.TenantAdminAccounts.AnyAsync(a => a.ClientSiteId == clientSiteId && a.Id != id && a.Email.ToLower() == email);
            if (emailTaken) return Results.BadRequest(new { error = "Un compte existe déjà avec cet email." });

            account.FirstName = firstName;
            account.LastName = lastName;
            account.Email = email;
            account.Phone = input.Phone?.Trim() ?? "";
            await db.SaveChangesAsync();

            return Results.Ok(new { account.Id, account.FirstName, account.LastName, account.Email, account.Phone, account.ActivatedAt, account.CreatedAt });
        });

        app.MapDelete("/api/t/{clientSiteId:guid}/admin/accounts/{id:guid}", async (Guid clientSiteId, Guid id, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsOwnerAuthorizedAsync(req, config, clientSiteId)) return Results.Unauthorized();

            var account = await db.TenantAdminAccounts.FirstOrDefaultAsync(a => a.Id == id && a.ClientSiteId == clientSiteId);
            if (account is null) return Results.NotFound();

            db.TenantAdminAccounts.Remove(account);
            await db.SaveChangesAsync();

            return Results.Ok();
        });

        // Historique des actions (voir AdminActionLog.cs) — owner-only comme Comptes/Modules/Stripe.
        // Pagination par décalage : on demande `take + 1` lignes pour savoir s'il en reste au-delà de
        // la page courante (`hasMore`) sans avoir à faire un COUNT séparé.
        app.MapGet("/api/t/{clientSiteId:guid}/admin/action-logs", async (Guid clientSiteId, int? skip, int? take, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsOwnerAuthorizedAsync(req, config, clientSiteId)) return Results.Unauthorized();

            var pageSize = Math.Clamp(take ?? 20, 1, 100);
            var offset = Math.Max(skip ?? 0, 0);

            var rows = await db.AdminActionLogs
                .Where(l => l.ClientSiteId == clientSiteId)
                .OrderByDescending(l => l.CreatedAt)
                .Skip(offset)
                .Take(pageSize + 1)
                .Select(l => new { l.Id, l.ActorType, l.ActorLabel, l.Action, l.Method, l.Path, l.StatusCode, l.CreatedAt })
                .ToListAsync();

            return Results.Ok(new { items = rows.Take(pageSize), hasMore = rows.Count > pageSize });
        });

        // Renvoie une invitation — sert aussi bien à relancer un employé qui n'a jamais activé son
        // compte qu'à "réinitialiser" l'accès de quelqu'un qui a oublié son mot de passe (pas de
        // mécanisme "mot de passe oublié" séparé, ce serait redondant avec ce flux).
        app.MapPost("/api/t/{clientSiteId:guid}/admin/accounts/{id:guid}/resend-invite", async (
            Guid clientSiteId, Guid id, HttpRequest req, IConfiguration config, AppDbContext db, IHttpClientFactory httpFactory) =>
        {
            if (!await TenantAdminAuth.IsOwnerAuthorizedAsync(req, config, clientSiteId)) return Results.Unauthorized();

            var account = await db.TenantAdminAccounts.FirstOrDefaultAsync(a => a.Id == id && a.ClientSiteId == clientSiteId);
            if (account is null) return Results.NotFound();

            var sent = await SendInviteAsync(db, httpFactory, config, clientSiteId, account);
            return sent ? Results.Ok(new { sent = true }) : Results.Json(new { error = "Envoi indisponible pour le moment." }, statusCode: StatusCodes.Status500InternalServerError);
        });

        // Suite de l'invitation — publics (l'employé n'a pas encore de session à ce stade), même
        // patron 2 temps que CompteClientModule (verify = lecture seule, confirm = active vraiment).
        app.MapGet("/api/t/{clientSiteId:guid}/admin/accounts/invitation", async (Guid clientSiteId, string token, AppDbContext db) =>
        {
            var invite = await FindValidInviteAsync(db, clientSiteId, token);
            if (invite is null) return Results.BadRequest(new { valid = false });

            var account = await db.TenantAdminAccounts.FindAsync(invite.AccountId);
            return Results.Ok(new { valid = true, firstName = account?.FirstName ?? "", email = account?.Email ?? "" });
        });

        app.MapPost("/api/t/{clientSiteId:guid}/admin/accounts/invitation/confirm", async (
            Guid clientSiteId, ConfirmInviteInput input, AppDbContext db, IConfiguration config) =>
        {
            if (string.IsNullOrWhiteSpace(input.Password) || input.Password.Length < 8)
            {
                return Results.BadRequest(new { error = "Le mot de passe doit contenir au moins 8 caractères." });
            }

            var invite = await FindValidInviteAsync(db, clientSiteId, input.Token);
            if (invite is null) return Results.BadRequest(new { error = "Ce lien d'invitation n'est plus valide." });

            var account = await db.TenantAdminAccounts.FirstOrDefaultAsync(a => a.Id == invite.AccountId && a.ClientSiteId == clientSiteId);
            if (account is null) return Results.BadRequest(new { error = "Ce lien d'invitation n'est plus valide." });

            account.PasswordHash = AdminPasswordHasher.Hash(input.Password);
            account.ActivatedAt = DateTime.UtcNow;
            invite.UsedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            await AdminActionLogger.LogAsync(
                db, clientSiteId, "employee", $"{account.FirstName} {account.LastName}".Trim(),
                "POST", $"/api/t/{clientSiteId}/admin/accounts/invitation/confirm", "Compte activé", 200);

            // Ouvre directement la session, comme CompteClientModule.confirm-login — évite de
            // renvoyer l'employé sur l'écran de login juste après avoir défini son mot de passe.
            var sessionToken = AdminToken.Issue(config, "tenant-employee", clientSiteId, account.Id);
            return Results.Ok(new { token = sessionToken, expiresAt = AdminToken.ExpiresAtUnixSeconds(sessionToken) });
        });
    }

    private static async Task<TenantAdminAccountInvite?> FindValidInviteAsync(AppDbContext db, Guid clientSiteId, string token)
    {
        var invite = await db.TenantAdminAccountInvites
            .FirstOrDefaultAsync(i => i.ClientSiteId == clientSiteId && i.Token == token);

        if (invite is null || invite.UsedAt is not null || invite.ExpiresAt < DateTime.UtcNow) return null;
        return invite;
    }

    private static readonly TimeSpan InviteTtl = TimeSpan.FromHours(48);

    private static async Task<bool> SendInviteAsync(AppDbContext db, IHttpClientFactory httpFactory, IConfiguration config, Guid clientSiteId, TenantAdminAccount account)
    {
        var invite = new TenantAdminAccountInvite
        {
            Id = Guid.NewGuid(),
            ClientSiteId = clientSiteId,
            AccountId = account.Id,
            Token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)),
            ExpiresAt = DateTime.UtcNow.Add(InviteTtl),
            CreatedAt = DateTime.UtcNow,
        };
        db.TenantAdminAccountInvites.Add(invite);
        await db.SaveChangesAsync();

        var emailSettings = await AgencyEmailEndpoints.GetOrCreateAsync(db);
        if (string.IsNullOrWhiteSpace(emailSettings.BrevoApiKey)) return false;

        var site = await db.ClientSites.FindAsync(clientSiteId);
        if (site is null) return false;

        var http = httpFactory.CreateClient();
        var frontendBaseUrl = config["Cors:AllowedOrigin"] ?? "http://localhost:5173";
        var inviteUrl = $"{frontendBaseUrl.TrimEnd('/')}/admin/{clientSiteId}/invitation?token={invite.Token}";

        try
        {
            return await BrevoEmailService.SendTenantAdminInviteAsync(http, emailSettings.BrevoApiKey, site.Name, account.FirstName, account.Email, inviteUrl);
        }
        catch (Exception)
        {
            // Best-effort, même logique que les autres envois transactionnels du projet — le compte
            // existe déjà même si l'email échoue, "Renvoyer l'invitation" reste possible ensuite.
            return false;
        }
    }
}

public record AdminLoginInput(string Password, string? Email = null);
public record ToggleModuleInput(bool Enabled);
public record SupportRequestInput(string Message, string? ReplyToEmail);
public record TenantAccountInput(string FirstName, string LastName, string Email, string? Phone);
public record ConfirmInviteInput(string Token, string Password);
