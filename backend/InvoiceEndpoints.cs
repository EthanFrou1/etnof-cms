using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;

namespace Backend;

// Factures de l'agence — voir Invoice.cs pour la règle de numérotation. Réservé à Ethan (AdminAuth).
public static class InvoiceEndpoints
{
    public static void MapEndpoints(WebApplication app)
    {
        app.MapGet("/api/admin/invoices", async (HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();

            var invoices = await db.Invoices.OrderByDescending(i => i.CreatedAt).ToListAsync();
            var clientNames = await db.BillingClients.ToDictionaryAsync(c => c.Id, c => c.Name);
            return Results.Ok(invoices.Select(i => ToListItem(i, clientNames)));
        });

        app.MapGet("/api/admin/invoices/{id:guid}", async (Guid id, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();

            var invoice = await db.Invoices.FindAsync(id);
            if (invoice is null) return Results.NotFound();
            return Results.Ok(ToDetail(invoice));
        });

        app.MapPost("/api/admin/invoices", async (InvoiceInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();

            var client = await db.BillingClients.FindAsync(input.BillingClientId);
            if (client is null) return Results.BadRequest(new { error = "Client de facturation introuvable." });

            var issueDate = DateTime.UtcNow;
            var invoice = new Invoice
            {
                Id = Guid.NewGuid(),
                Number = null,
                BillingClientId = input.BillingClientId,
                QuoteId = input.QuoteId,
                InvoiceType = input.InvoiceType,
                Status = "draft",
                IssueDate = issueDate,
                DueDate = issueDate.AddDays(30),
                LineItemsJson = JsonSerializer.Serialize(input.Lines),
                TotalHt = ComputeTotal(input.Lines),
                Notes = input.Notes,
                IsFinalized = false,
                CreatedAt = issueDate,
            };

            db.Invoices.Add(invoice);
            await db.SaveChangesAsync();
            return Results.Created($"/api/admin/invoices/{invoice.Id}", ToDetail(invoice));
        });

        app.MapPut("/api/admin/invoices/{id:guid}", async (Guid id, InvoiceInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();

            var invoice = await db.Invoices.FindAsync(id);
            if (invoice is null) return Results.NotFound();
            if (invoice.IsFinalized) return Results.BadRequest(new { error = "Une facture finalisée ne peut plus être modifiée." });

            invoice.BillingClientId = input.BillingClientId;
            invoice.QuoteId = input.QuoteId;
            invoice.InvoiceType = input.InvoiceType;
            invoice.LineItemsJson = JsonSerializer.Serialize(input.Lines);
            invoice.TotalHt = ComputeTotal(input.Lines);
            invoice.Notes = input.Notes;

            await db.SaveChangesAsync();
            return Results.Ok(ToDetail(invoice));
        });

        app.MapDelete("/api/admin/invoices/{id:guid}", async (Guid id, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();

            var invoice = await db.Invoices.FindAsync(id);
            if (invoice is null) return Results.NotFound();
            // Une facture finalisée garde son numéro à vie (séquence légale sans trou) — jamais de
            // suppression, seule l'annulation (statut "cancelled") reste possible depuis le brouillon.
            if (invoice.IsFinalized) return Results.BadRequest(new { error = "Une facture finalisée ne peut pas être supprimée." });

            db.Invoices.Remove(invoice);
            await db.SaveChangesAsync();
            return Results.Ok();
        });

        app.MapPost("/api/admin/invoices/{id:guid}/finalize", async (Guid id, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();

            var invoice = await db.Invoices.FindAsync(id);
            if (invoice is null) return Results.NotFound();
            if (invoice.IsFinalized) return Results.BadRequest(new { error = "Cette facture est déjà finalisée." });
            if (invoice.LineItemsJson == "[]") return Results.BadRequest(new { error = "Ajoute au moins une ligne avant de finaliser." });

            invoice.Number = await NextNumberAsync(db, DateTime.UtcNow.Year);
            invoice.IsFinalized = true;
            invoice.Status = "sent";
            await db.SaveChangesAsync();
            return Results.Ok(ToDetail(invoice));
        });

        app.MapPost("/api/admin/invoices/{id:guid}/mark-paid", async (Guid id, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();

            var invoice = await db.Invoices.FindAsync(id);
            if (invoice is null) return Results.NotFound();
            if (!invoice.IsFinalized) return Results.BadRequest(new { error = "Finalise d'abord la facture." });

            invoice.Status = "paid";
            invoice.PaidAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.Ok(ToDetail(invoice));
        });

        app.MapPost("/api/admin/invoices/{id:guid}/cancel", async (Guid id, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();

            var invoice = await db.Invoices.FindAsync(id);
            if (invoice is null) return Results.NotFound();

            // Le numéro n'est jamais libéré/réutilisé, même annulée (séquence légale sans trou).
            invoice.Status = "cancelled";
            await db.SaveChangesAsync();
            return Results.Ok(ToDetail(invoice));
        });

        app.MapGet("/api/admin/invoices/{id:guid}/pdf", async (Guid id, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();

            var invoice = await db.Invoices.FindAsync(id);
            if (invoice is null) return Results.NotFound();
            var client = await db.BillingClients.FindAsync(invoice.BillingClientId);
            if (client is null) return Results.NotFound();
            var company = await CompanyProfileEndpoints.GetOrCreateAsync(db);

            var bytes = new InvoicePdfDocument(company, client, invoice, ParseLines(invoice.LineItemsJson)).GeneratePdf();
            var fileName = invoice.Number is not null ? $"facture-{invoice.Number}.pdf" : $"facture-brouillon-{invoice.Id}.pdf";
            return Results.File(bytes, "application/pdf", fileName);
        });

        // Pré-remplit un brouillon de facture depuis un devis accepté — Ethan choisit ensuite le type
        // (acompte/solde/unique) et ajuste les lignes/montant avant de finaliser (voir docs/13-facturation-devis.md).
        app.MapPost("/api/admin/quotes/{quoteId:guid}/create-invoice", async (
            Guid quoteId, CreateInvoiceFromQuoteInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();

            var quote = await db.Quotes.FindAsync(quoteId);
            if (quote is null) return Results.NotFound();
            if (quote.Status != "accepted") return Results.BadRequest(new { error = "Seul un devis accepté peut donner lieu à une facture." });

            var issueDate = DateTime.UtcNow;
            var invoice = new Invoice
            {
                Id = Guid.NewGuid(),
                Number = null,
                BillingClientId = quote.BillingClientId,
                QuoteId = quote.Id,
                InvoiceType = input.InvoiceType,
                Status = "draft",
                IssueDate = issueDate,
                DueDate = issueDate.AddDays(30),
                LineItemsJson = quote.LineItemsJson,
                TotalHt = quote.TotalHt,
                Notes = quote.Notes,
                IsFinalized = false,
                CreatedAt = issueDate,
            };

            db.Invoices.Add(invoice);
            await db.SaveChangesAsync();
            return Results.Created($"/api/admin/invoices/{invoice.Id}", ToDetail(invoice));
        });
    }

    // Obligation légale : séquence chronologique sans trou. Assignée uniquement à la finalisation
    // (jamais à la création en brouillon) pour qu'un brouillon jamais finalisé/supprimé ne crée pas
    // de trou dans la numérotation — voir Invoice.cs.
    private static async Task<string> NextNumberAsync(AppDbContext db, int year)
    {
        var prefix = $"{year}-";
        var numbers = await db.Invoices
            .Where(i => i.Number != null && i.Number.StartsWith(prefix))
            .Select(i => i.Number!)
            .ToListAsync();

        var maxSeq = numbers
            .Select(n => int.TryParse(n.Substring(prefix.Length), out var seq) ? seq : 0)
            .DefaultIfEmpty(0)
            .Max();

        return $"{prefix}{(maxSeq + 1):D4}";
    }

    private static decimal ComputeTotal(List<InvoiceLineDto> lines) => lines.Sum(l => l.Quantity * l.UnitPrice);

    private static List<InvoiceLineDto> ParseLines(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new List<InvoiceLineDto>();
        try
        {
            return JsonSerializer.Deserialize<List<InvoiceLineDto>>(json) ?? new List<InvoiceLineDto>();
        }
        catch (JsonException)
        {
            return new List<InvoiceLineDto>();
        }
    }

    private static object ToListItem(Invoice invoice, Dictionary<Guid, string> clientNames) => new
    {
        invoice.Id,
        invoice.Number,
        invoice.InvoiceType,
        invoice.Status,
        invoice.IssueDate,
        invoice.DueDate,
        invoice.TotalHt,
        invoice.IsFinalized,
        invoice.BillingClientId,
        ClientName = clientNames.GetValueOrDefault(invoice.BillingClientId, "Client supprimé"),
    };

    private static object ToDetail(Invoice invoice) => new
    {
        invoice.Id,
        invoice.Number,
        invoice.BillingClientId,
        invoice.QuoteId,
        invoice.InvoiceType,
        invoice.Status,
        invoice.IssueDate,
        invoice.DueDate,
        Lines = ParseLines(invoice.LineItemsJson),
        invoice.TotalHt,
        invoice.Notes,
        invoice.PaidAt,
        invoice.IsFinalized,
        invoice.CreatedAt,
    };
}

public record InvoiceInput(Guid BillingClientId, Guid? QuoteId, string InvoiceType, List<InvoiceLineDto> Lines, string Notes);
public record CreateInvoiceFromQuoteInput(string InvoiceType);
