using System.Security.Cryptography;
using Backend;
using Microsoft.EntityFrameworkCore;
using Modules.Catalogue;

namespace Modules.CompteClient;

// Compte client public : connexion par lien email (pas de mot de passe, voir CustomerToken.cs et
// docs/05-roadmap-poc.md pour la discussion complète) — historique de commandes + modification de
// ses propres informations, depuis le site public. S'appuie sur `Customer` (module Catalogue) : un
// compte n'existe que pour un email qui a déjà une fiche client (première commande passée, ou ajouté
// manuellement par le tenant depuis son admin) — pas de création de compte "à vide" en v1.
public static class CompteClientModule
{
    public const string Name = "compte-client";
    private static readonly TimeSpan LoginTokenTtl = TimeSpan.FromMinutes(15);

    public static void MapEndpoints(WebApplication app)
    {
        app.MapPost("/api/t/{clientSiteId:guid}/account/request-login", async (
            Guid clientSiteId, RequestLoginInput input, AppDbContext db, ModuleRegistry registry,
            IHttpClientFactory httpFactory, IConfiguration config) =>
        {
            if (!await registry.IsEnabledAsync(clientSiteId, Name)) return Results.NotFound();

            var email = input.Email.Trim().ToLowerInvariant();
            if (email.Length == 0) return Results.BadRequest(new { error = "Email requis." });

            // Toujours la même réponse, que l'email corresponde à un client ou non — ne jamais
            // laisser un visiteur déduire si une adresse a déjà commandé chez ce tenant.
            var customer = await db.Customers.FirstOrDefaultAsync(c => c.ClientSiteId == clientSiteId && c.Email.ToLower() == email);
            if (customer is not null)
            {
                try
                {
                    var loginToken = new CustomerLoginToken
                    {
                        Id = Guid.NewGuid(),
                        ClientSiteId = clientSiteId,
                        CustomerId = customer.Id,
                        Token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)),
                        ExpiresAt = DateTime.UtcNow.Add(LoginTokenTtl),
                        CreatedAt = DateTime.UtcNow,
                    };
                    db.CustomerLoginTokens.Add(loginToken);
                    await db.SaveChangesAsync();

                    var emailSettings = await AgencyEmailEndpoints.GetOrCreateAsync(db);
                    if (!string.IsNullOrWhiteSpace(emailSettings.BrevoApiKey))
                    {
                        var site = await db.SiteContents.FirstOrDefaultAsync(s => s.ClientSiteId == clientSiteId);
                        if (site is not null)
                        {
                            var http = httpFactory.CreateClient();
                            var frontendBaseUrl = config["Cors:AllowedOrigin"] ?? "http://localhost:5173";
                            var loginUrl = $"{frontendBaseUrl.TrimEnd('/')}/t/{clientSiteId}/compte?token={loginToken.Token}";
                            await BrevoEmailService.SendCustomerLoginLinkAsync(http, emailSettings.BrevoApiKey, site, customer, loginUrl);
                        }
                    }
                }
                catch (Exception)
                {
                    // Best-effort, même logique que les autres envois transactionnels (voir
                    // StripeModule.cs) — ne jamais faire échouer la requête pour un souci d'email.
                }
            }

            return Results.Ok(new { sent = true });
        });

        app.MapGet("/api/t/{clientSiteId:guid}/account/verify-login", async (Guid clientSiteId, string token, AppDbContext db, ModuleRegistry registry) =>
        {
            if (!await registry.IsEnabledAsync(clientSiteId, Name)) return Results.NotFound();

            var loginToken = await FindValidLoginTokenAsync(db, clientSiteId, token);
            if (loginToken is null) return Results.BadRequest(new { valid = false });

            var customer = await db.Customers.FindAsync(loginToken.CustomerId);
            return Results.Ok(new { valid = true, customerName = customer?.Name ?? "" });
        });

        // Volontairement un POST distinct du GET ci-dessus : le lien de l'email pointe vers une page
        // qui affiche "Confirmer la connexion ?" et n'établit la session qu'au clic sur un bouton
        // (ce POST) — jamais au chargement de la page (le GET), qui pourrait être déclenché par un
        // scanner de sécurité de messagerie avant même que le client n'ouvre l'email (voir
        // CustomerLoginToken.cs).
        app.MapPost("/api/t/{clientSiteId:guid}/account/confirm-login", async (
            Guid clientSiteId, ConfirmLoginInput input, AppDbContext db, ModuleRegistry registry, IConfiguration config) =>
        {
            if (!await registry.IsEnabledAsync(clientSiteId, Name)) return Results.NotFound();

            var loginToken = await FindValidLoginTokenAsync(db, clientSiteId, input.Token);
            if (loginToken is null) return Results.BadRequest(new { error = "Lien de connexion invalide ou expiré." });

            var customer = await db.Customers.FindAsync(loginToken.CustomerId);
            if (customer is null) return Results.BadRequest(new { error = "Lien de connexion invalide ou expiré." });

            loginToken.UsedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            var sessionToken = CustomerToken.Issue(config, clientSiteId, customer.Id);
            return Results.Ok(new { token = sessionToken, customerName = customer.Name });
        });

        app.MapGet("/api/t/{clientSiteId:guid}/account/me", async (Guid clientSiteId, HttpRequest req, AppDbContext db, ModuleRegistry registry, IConfiguration config) =>
        {
            if (!await registry.IsEnabledAsync(clientSiteId, Name)) return Results.NotFound();
            if (!TryAuthenticate(req, config, clientSiteId, out var customerId)) return Results.Unauthorized();

            var customer = await db.Customers.FirstOrDefaultAsync(c => c.Id == customerId && c.ClientSiteId == clientSiteId);
            if (customer is null) return Results.NotFound();

            var orders = await db.Orders
                .Where(o => o.CustomerId == customerId && o.ClientSiteId == clientSiteId)
                .OrderByDescending(o => o.CreatedAt)
                .Include(o => o.Items)
                .ToListAsync();

            return Results.Ok(new { customer, orders });
        });

        app.MapPut("/api/t/{clientSiteId:guid}/account/me", async (
            Guid clientSiteId, UpdateAccountInput input, HttpRequest req, AppDbContext db, ModuleRegistry registry, IConfiguration config) =>
        {
            if (!await registry.IsEnabledAsync(clientSiteId, Name)) return Results.NotFound();
            if (!TryAuthenticate(req, config, clientSiteId, out var customerId)) return Results.Unauthorized();

            var customer = await db.Customers.FirstOrDefaultAsync(c => c.Id == customerId && c.ClientSiteId == clientSiteId);
            if (customer is null) return Results.NotFound();

            // L'email reste modifiable uniquement par le tenant depuis son admin (pas en self-service)
            // — un changement d'email a des implications sur l'identification des commandes passées
            // qui méritent une vraie réflexion avant de l'ouvrir au client lui-même.
            customer.Name = input.Name;
            customer.Phone = input.Phone;
            customer.AddressLine1 = input.AddressLine1;
            customer.AddressLine2 = input.AddressLine2;
            customer.PostalCode = input.PostalCode;
            customer.City = input.City;
            customer.Country = input.Country;
            await db.SaveChangesAsync();

            return Results.Ok(customer);
        });
    }

    private static async Task<CustomerLoginToken?> FindValidLoginTokenAsync(AppDbContext db, Guid clientSiteId, string token)
    {
        var loginToken = await db.CustomerLoginTokens
            .FirstOrDefaultAsync(t => t.ClientSiteId == clientSiteId && t.Token == token);

        if (loginToken is null || loginToken.UsedAt is not null || loginToken.ExpiresAt < DateTime.UtcNow) return null;
        return loginToken;
    }

    private static bool TryAuthenticate(HttpRequest request, IConfiguration config, Guid clientSiteId, out Guid customerId)
    {
        var token = CustomerToken.FromAuthorizationHeader(request);
        return CustomerToken.TryValidate(config, token, clientSiteId, out customerId);
    }
}

public record RequestLoginInput(string Email);
public record ConfirmLoginInput(string Token);
public record UpdateAccountInput(
    string Name,
    string Phone,
    string AddressLine1,
    string AddressLine2,
    string PostalCode,
    string City,
    string Country
);
