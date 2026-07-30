using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using Stripe;
using Stripe.Checkout;

namespace Backend;

// Paiement en ligne d'une facture de l'agence via son propre compte Stripe (AgencyStripeSettings) —
// même mécanisme que modules/stripe/backend/StripeModule.cs (session Checkout + webhook confirme le
// paiement), mais agence plutôt que par tenant : pas de ModuleRegistry, pas de ClientSiteId.
public static class InvoicePaymentEndpoints
{
    public static void MapEndpoints(WebApplication app)
    {
        // Public : consultée par la page /facture/{id}, jamais un brouillon.
        app.MapGet("/api/public/invoices/{id:guid}", async (Guid id, AppDbContext db) =>
        {
            var invoice = await db.Invoices.FindAsync(id);
            if (invoice is null || invoice.Status is not ("sent" or "paid")) return Results.NotFound();

            var client = await db.BillingClients.FindAsync(invoice.BillingClientId);
            var company = await CompanyProfileEndpoints.GetOrCreateAsync(db);

            return Results.Ok(new
            {
                invoice.Id,
                invoice.Number,
                invoice.InvoiceType,
                invoice.Status,
                invoice.IssueDate,
                invoice.DueDate,
                Lines = ParseLines(invoice.LineItemsJson),
                invoice.TotalHt,
                invoice.Notes,
                invoice.PaidAt,
                ClientName = client?.Name ?? "",
                CompanyTradeName = company.TradeName,
            });
        });

        app.MapPost("/api/public/invoices/{id:guid}/checkout", async (Guid id, InvoiceCheckoutInput input, AppDbContext db) =>
        {
            var invoice = await db.Invoices.FindAsync(id);
            if (invoice is null) return Results.NotFound();
            if (invoice.Status == "paid") return Results.BadRequest(new { error = "Cette facture est déjà payée." });
            if (invoice.Status != "sent") return Results.BadRequest(new { error = "Cette facture n'est pas disponible au paiement en ligne." });

            var settings = await AgencyStripeEndpoints.GetOrCreateAsync(db);
            if (string.IsNullOrWhiteSpace(settings.SecretKey))
            {
                return Results.BadRequest(new { error = "Le paiement en ligne n'est pas encore configuré." });
            }

            var returnBaseUrl = string.IsNullOrWhiteSpace(input.ReturnBaseUrl)
                ? $"http://localhost:5173/facture/{id}"
                : $"{input.ReturnBaseUrl}/facture/{id}";

            var options = new SessionCreateOptions
            {
                Mode = "payment",
                LineItems = new List<SessionLineItemOptions>
                {
                    new()
                    {
                        Quantity = 1,
                        PriceData = new SessionLineItemPriceDataOptions
                        {
                            Currency = "eur",
                            UnitAmount = (long)Math.Round(invoice.TotalHt * 100),
                            ProductData = new SessionLineItemPriceDataProductDataOptions
                            {
                                Name = $"Facture {invoice.Number}",
                            },
                        },
                    },
                },
                SuccessUrl = $"{returnBaseUrl}?checkout=success&session_id={{CHECKOUT_SESSION_ID}}",
                CancelUrl = $"{returnBaseUrl}?checkout=cancel",
                Metadata = new Dictionary<string, string> { ["invoiceId"] = invoice.Id.ToString() },
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

        // Appelé par Stripe, jamais par le navigateur — seule source de vérité pour marquer une
        // facture payée (même principe que le webhook du module Stripe tenant).
        app.MapPost("/api/public/invoices/stripe-webhook", async (HttpRequest request, AppDbContext db, IHttpClientFactory httpFactory, IConfiguration config) =>
        {
            var settings = await AgencyStripeEndpoints.GetOrCreateAsync(db);
            if (string.IsNullOrWhiteSpace(settings.WebhookSecret))
            {
                return Results.BadRequest(new { error = "Webhook Stripe non configuré." });
            }

            using var reader = new StreamReader(request.Body);
            var json = await reader.ReadToEndAsync();

            Event stripeEvent;
            try
            {
                stripeEvent = EventUtility.ConstructEvent(json, request.Headers["Stripe-Signature"], settings.WebhookSecret, throwOnApiVersionMismatch: false);
            }
            catch (StripeException)
            {
                return Results.BadRequest(new { error = "Signature invalide." });
            }

            if (stripeEvent.Type != "checkout.session.completed") return Results.Ok();

            var session = stripeEvent.Data.Object as Session;
            if (session is null) return Results.Ok();

            // Idempotence : Stripe peut renvoyer le même événement plusieurs fois.
            if (await db.Invoices.AnyAsync(i => i.StripeSessionId == session.Id)) return Results.Ok();

            var invoiceIdRaw = (session.Metadata ?? new Dictionary<string, string>()).GetValueOrDefault("invoiceId");
            if (!Guid.TryParse(invoiceIdRaw, out var invoiceId)) return Results.Ok();

            var invoice = await db.Invoices.FindAsync(invoiceId);
            if (invoice is null || invoice.Status == "paid") return Results.Ok();

            invoice.Status = "paid";
            invoice.PaidAt = DateTime.UtcNow;
            invoice.StripeSessionId = session.Id;
            await db.SaveChangesAsync();

            // L'email de confirmation ne doit jamais faire échouer la confirmation du paiement déjà
            // enregistrée ci-dessus — Stripe doit recevoir 200 dans tous les cas, voir
            // docs/13-facturation-devis.md (décision Brevo).
            try
            {
                var emailSettings = await AgencyEmailEndpoints.GetOrCreateAsync(db);
                if (!string.IsNullOrWhiteSpace(emailSettings.BrevoApiKey))
                {
                    var billingClient = await db.BillingClients.FindAsync(invoice.BillingClientId);
                    var company = await CompanyProfileEndpoints.GetOrCreateAsync(db);

                    if (billingClient is not null)
                    {
                        var lines = ParseLines(invoice.LineItemsJson);
                        var pdfBytes = new InvoicePdfDocument(company, billingClient, invoice, lines).GeneratePdf();
                        var http = httpFactory.CreateClient();
                        var frontendBaseUrl = config["Cors:AllowedOrigin"] ?? "http://localhost:5173";
                        var sent = await BrevoEmailService.SendInvoicePaidEmailAsync(http, emailSettings.BrevoApiKey, company, billingClient, invoice, lines, pdfBytes, frontendBaseUrl);
                        if (sent)
                        {
                            invoice.ConfirmationEmailSentAt = DateTime.UtcNow;
                            await db.SaveChangesAsync();
                        }
                    }
                }
            }
            catch (Exception)
            {
                // Ignoré volontairement — voir commentaire ci-dessus.
            }

            return Results.Ok();
        });
    }

    private static List<InvoiceLineDto> ParseLines(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new List<InvoiceLineDto>();
        try
        {
            return System.Text.Json.JsonSerializer.Deserialize<List<InvoiceLineDto>>(json) ?? new List<InvoiceLineDto>();
        }
        catch (System.Text.Json.JsonException)
        {
            return new List<InvoiceLineDto>();
        }
    }
}

public record InvoiceCheckoutInput(string? ReturnBaseUrl);
