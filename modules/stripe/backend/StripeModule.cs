using System.Text.Json;
using Backend;
using Microsoft.EntityFrameworkCore;
using Modules.Catalogue;
using Stripe;
using Stripe.Checkout;

namespace Modules.Stripe;

// Se branche sur le flux de commande du module Catalogue plutôt que de le dupliquer (voir
// docs/12-plan-modules-restants.md) : ce module remplace entièrement l'ancien /catalogue/checkout
// (paiement sur place, retiré) — une commande n'existe désormais que si Stripe confirme le paiement
// via webhook. Modèle "compte Stripe propre à chaque client" (pas de Stripe Connect) : chaque tenant
// fournit sa propre clé secrète + son propre secret de webhook (StripeSettings, jamais dans
// ModulesConfigJson qui est public — voir StripeSettings.cs), l'argent va directement sur son
// compte Stripe, jamais sur un compte agence.
public static class StripeModule
{
    public const string Name = "stripe";

    public static void MapEndpoints(WebApplication app)
    {
        // Public : crée une session Stripe Checkout et renvoie son URL. Le frontend redirige
        // (window.location.href) — pas de Stripe.js côté client, pas de clé publique nécessaire.
        app.MapPost("/api/t/{clientSiteId:guid}/stripe/checkout", async (Guid clientSiteId, CheckoutInput input, AppDbContext db, ModuleRegistry registry) =>
        {
            if (!await registry.IsEnabledAsync(clientSiteId, "catalogue")) return Results.NotFound();
            if (!await registry.IsEnabledAsync(clientSiteId, Name)) return Results.NotFound();

            if (input.Items is null || input.Items.Count == 0)
            {
                return Results.BadRequest(new { error = "Le panier est vide." });
            }

            var settings = await db.StripeSettings.FirstOrDefaultAsync(s => s.ClientSiteId == clientSiteId);
            if (settings is null || string.IsNullOrWhiteSpace(settings.SecretKey))
            {
                return Results.BadRequest(new { error = "Le paiement en ligne n'est pas encore configuré pour ce site." });
            }

            var lineItems = new List<SessionLineItemOptions>();

            foreach (var line in input.Items)
            {
                var product = await db.Products
                    .Include(p => p.Sizes)
                    .FirstOrDefaultAsync(p => p.ClientSiteId == clientSiteId && p.Id == line.ProductId);

                if (product is null)
                {
                    return Results.BadRequest(new { error = "Produit introuvable." });
                }

                if (line.Quantity <= 0)
                {
                    return Results.BadRequest(new { error = $"Quantité invalide pour \"{product.Name}\"." });
                }

                // Dès qu'un produit a des tailles, le stock global (product.Stock) n'est plus la
                // source de vérité pour la vente — voir ProductSize.cs. Une taille doit être précisée
                // et son propre stock vérifié.
                if (product.Sizes.Count > 0)
                {
                    var size = product.Sizes.FirstOrDefault(s => s.Label == line.Size);
                    if (size is null)
                    {
                        return Results.BadRequest(new { error = $"Taille invalide pour \"{product.Name}\"." });
                    }
                    if (size.Stock < line.Quantity)
                    {
                        return Results.BadRequest(new { error = $"Stock insuffisant pour \"{product.Name}\" ({size.Label}, disponible : {size.Stock})." });
                    }
                }
                else if (product.Stock < line.Quantity)
                {
                    return Results.BadRequest(new { error = $"Stock insuffisant pour \"{product.Name}\" (disponible : {product.Stock})." });
                }

                lineItems.Add(new SessionLineItemOptions
                {
                    Quantity = line.Quantity,
                    PriceData = new SessionLineItemPriceDataOptions
                    {
                        Currency = "eur",
                        UnitAmount = (long)Math.Round(product.Price * 100),
                        ProductData = new SessionLineItemPriceDataProductDataOptions
                        {
                            Name = string.IsNullOrWhiteSpace(line.Size) ? product.Name : $"{product.Name} ({line.Size})",
                        },
                    },
                });
            }

            // Panier reporté dans les métadonnées de la session (pas de ligne "commande" créée ici) :
            // l'Order n'est créé qu'à la confirmation du paiement par le webhook, pour ne jamais
            // décrémenter de stock sur un paiement abandonné. Limite connue (voir docs/12) : la
            // taille des métadonnées Stripe est limitée à 500 caractères par valeur, largement
            // suffisant pour un panier de site vitrine local mais pas conçu pour un très gros volume.
            var cartJson = JsonSerializer.Serialize(input.Items);
            var returnBaseUrl = string.IsNullOrWhiteSpace(input.ReturnBaseUrl) ? $"http://localhost:5173/t/{clientSiteId}" : input.ReturnBaseUrl;

            var options = new SessionCreateOptions
            {
                Mode = "payment",
                LineItems = lineItems,
                CustomerEmail = input.CustomerEmail,
                SuccessUrl = $"{returnBaseUrl}?checkout=success&session_id={{CHECKOUT_SESSION_ID}}",
                CancelUrl = $"{returnBaseUrl}?checkout=cancel",
                Metadata = new Dictionary<string, string>
                {
                    ["clientSiteId"] = clientSiteId.ToString(),
                    ["customerName"] = input.CustomerName,
                    ["customerEmail"] = input.CustomerEmail,
                    ["customerPhone"] = input.CustomerPhone ?? "",
                    ["customerAddress"] = input.CustomerAddress ?? "",
                    ["cart"] = cartJson,
                },
            };

            try
            {
                var service = new SessionService(new StripeClient(settings.SecretKey));
                var session = await service.CreateAsync(options);
                return Results.Ok(new { url = session.Url });
            }
            catch (StripeException ex)
            {
                return Results.Json(new { error = $"Stripe a refusé la demande : {ex.StripeError?.Message ?? ex.Message}" }, statusCode: 502);
            }
        });

        // Appelé par Stripe (pas par le navigateur) : confirme qu'un paiement a bien eu lieu. C'est
        // ce webhook, jamais la redirection navigateur, qui fait foi pour créer la commande — voir
        // commentaire en tête de fichier.
        app.MapPost("/api/t/{clientSiteId:guid}/stripe/webhook", async (
            Guid clientSiteId, HttpRequest request, AppDbContext db, IHttpClientFactory httpFactory) =>
        {
            var settings = await db.StripeSettings.FirstOrDefaultAsync(s => s.ClientSiteId == clientSiteId);
            if (settings is null || string.IsNullOrWhiteSpace(settings.WebhookSecret))
            {
                return Results.BadRequest(new { error = "Webhook Stripe non configuré pour ce site." });
            }

            using var reader = new StreamReader(request.Body);
            var json = await reader.ReadToEndAsync();

            Event stripeEvent;
            try
            {
                // throwOnApiVersionMismatch: false — chaque tenant a son propre compte Stripe, donc
                // sa propre version d'API configurée côté Stripe, indépendante de la version figée
                // dans le SDK Stripe.net utilisé ici. On ne veut jamais rejeter un webhook légitime
                // pour un simple écart de version ; seule la signature (secret du tenant) fait foi.
                stripeEvent = EventUtility.ConstructEvent(json, request.Headers["Stripe-Signature"], settings.WebhookSecret, throwOnApiVersionMismatch: false);
            }
            catch (StripeException)
            {
                return Results.BadRequest(new { error = "Signature invalide." });
            }

            if (stripeEvent.Type != "checkout.session.completed")
            {
                return Results.Ok();
            }

            var session = stripeEvent.Data.Object as Session;
            if (session is null) return Results.Ok();

            // Idempotence : Stripe peut renvoyer le même événement plusieurs fois.
            if (await db.Orders.AnyAsync(o => o.StripeSessionId == session.Id))
            {
                return Results.Ok();
            }

            var metadata = session.Metadata ?? new Dictionary<string, string>();
            var cartJson = metadata.GetValueOrDefault("cart");
            var items = string.IsNullOrWhiteSpace(cartJson)
                ? new List<CheckoutItemInput>()
                : JsonSerializer.Deserialize<List<CheckoutItemInput>>(cartJson) ?? new();

            if (items.Count == 0) return Results.Ok();

            var email = (metadata.GetValueOrDefault("customerEmail") ?? session.CustomerDetails?.Email ?? "").Trim();
            var name = metadata.GetValueOrDefault("customerName") ?? session.CustomerDetails?.Name ?? "";
            var phone = metadata.GetValueOrDefault("customerPhone") ?? "";
            var address = metadata.GetValueOrDefault("customerAddress") ?? "";

            await using var transaction = await db.Database.BeginTransactionAsync();

            var customer = await db.Customers.FirstOrDefaultAsync(c =>
                c.ClientSiteId == clientSiteId && c.Email.ToLower() == email.ToLower());

            if (customer is null)
            {
                customer = new Modules.Catalogue.Customer
                {
                    Id = Guid.NewGuid(),
                    ClientSiteId = clientSiteId,
                    Name = name,
                    Email = email,
                    Phone = phone,
                    Address = address,
                    CreatedAt = DateTime.UtcNow,
                };
                db.Customers.Add(customer);
            }

            var order = new Order
            {
                Id = Guid.NewGuid(),
                ClientSiteId = clientSiteId,
                CustomerId = customer.Id,
                CustomerName = name,
                CustomerEmail = email,
                Status = "pending",
                StripeSessionId = session.Id,
                CreatedAt = DateTime.UtcNow,
            };

            decimal total = 0;

            foreach (var line in items)
            {
                var product = await db.Products
                    .Include(p => p.Sizes)
                    .FirstOrDefaultAsync(p => p.ClientSiteId == clientSiteId && p.Id == line.ProductId);
                if (product is null) continue;

                // Le paiement est déjà encaissé à ce stade : on ne bloque jamais la création de la
                // commande pour un problème de stock (rare — deux clients achetant le dernier
                // exemplaire pendant que l'un finalise son paiement Stripe). Le stock est simplement
                // ramené à 0 plutôt que rendu négatif ; un cas de survente doit être traité
                // manuellement par le client (voir docs/12-plan-modules-restants.md).
                var size = string.IsNullOrWhiteSpace(line.Size) ? null : product.Sizes.FirstOrDefault(s => s.Label == line.Size);
                if (size is not null)
                {
                    size.Stock = Math.Max(0, size.Stock - line.Quantity);
                }
                else
                {
                    product.Stock = Math.Max(0, product.Stock - line.Quantity);
                }

                var itemTotal = product.Price * line.Quantity;
                total += itemTotal;

                order.Items.Add(new OrderItem
                {
                    Id = Guid.NewGuid(),
                    OrderId = order.Id,
                    ProductId = product.Id,
                    ProductName = product.Name,
                    UnitPrice = product.Price,
                    Quantity = line.Quantity,
                    SizeLabel = size?.Label,
                });
            }

            order.Total = total;
            db.Orders.Add(order);
            await db.SaveChangesAsync();
            await transaction.CommitAsync();

            // Best-effort, comme la confirmation de paiement de facture (voir InvoicePaymentEndpoints.cs)
            // — Stripe doit recevoir 200 dans tous les cas, la commande est déjà enregistrée ci-dessus.
            try
            {
                var emailSettings = await AgencyEmailEndpoints.GetOrCreateAsync(db);
                if (!string.IsNullOrWhiteSpace(emailSettings.BrevoApiKey))
                {
                    var site = await db.SiteContents.FirstOrDefaultAsync(s => s.ClientSiteId == clientSiteId);
                    if (site is not null)
                    {
                        var http = httpFactory.CreateClient();
                        await BrevoEmailService.SendOrderConfirmationEmailAsync(http, emailSettings.BrevoApiKey, site, order, order.Items);
                    }
                }
            }
            catch (Exception)
            {
                // Ignoré volontairement — voir commentaire ci-dessus.
            }

            return Results.Ok();
        });

        // Public : consulté par la page de retour du site (?checkout=success&session_id=...) pour
        // afficher une confirmation sans dépendre du webhook (qui peut arriver après la redirection).
        app.MapGet("/api/t/{clientSiteId:guid}/stripe/session/{sessionId}", async (Guid clientSiteId, string sessionId, AppDbContext db, ModuleRegistry registry) =>
        {
            if (!await registry.IsEnabledAsync(clientSiteId, Name)) return Results.NotFound();

            var settings = await db.StripeSettings.FirstOrDefaultAsync(s => s.ClientSiteId == clientSiteId);
            if (settings is null || string.IsNullOrWhiteSpace(settings.SecretKey)) return Results.NotFound();

            try
            {
                var service = new SessionService(new StripeClient(settings.SecretKey));
                var session = await service.GetAsync(sessionId);
                return Results.Ok(new { status = session.PaymentStatus, amountTotal = (session.AmountTotal ?? 0) / 100m });
            }
            catch (StripeException)
            {
                return Results.NotFound();
            }
        });
    }
}

public record CheckoutInput(string CustomerName, string CustomerEmail, string? CustomerPhone, string? CustomerAddress, List<CheckoutItemInput> Items, string ReturnBaseUrl);
public record CheckoutItemInput(Guid ProductId, int Quantity, string? Size);
