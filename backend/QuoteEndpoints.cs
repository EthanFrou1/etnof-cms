using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;

namespace Backend;

// Devis de l'agence — CRUD admin (AdminAuth) + endpoints publics sans auth pour que le client final
// consulte et accepte son devis via un simple lien (voir docs/13-facturation-devis.md, "signature
// électronique simple"). Pas de navigation EF vers BillingClient (même choix qu'Order.CustomerId,
// module Catalogue) : les endpoints qui ont besoin des deux font deux requêtes séparées.
public static class QuoteEndpoints
{
    public static void MapEndpoints(WebApplication app)
    {
        app.MapGet("/api/admin/quotes", async (HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();

            var quotes = await db.Quotes.OrderByDescending(q => q.CreatedAt).ToListAsync();
            var clientNames = await db.BillingClients.ToDictionaryAsync(c => c.Id, c => c.Name);
            return Results.Ok(quotes.Select(q => ToListItem(q, clientNames)));
        });

        app.MapGet("/api/admin/quotes/{id:guid}", async (Guid id, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();

            var quote = await db.Quotes.FindAsync(id);
            if (quote is null) return Results.NotFound();
            return Results.Ok(ToDetail(quote));
        });

        app.MapPost("/api/admin/quotes", async (QuoteInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();

            var client = await db.BillingClients.FindAsync(input.BillingClientId);
            if (client is null) return Results.BadRequest(new { error = "Client de facturation introuvable." });

            var issueDate = DateTime.UtcNow;
            var quote = new Quote
            {
                Id = Guid.NewGuid(),
                Number = await NextNumberAsync(db, issueDate.Year),
                BillingClientId = input.BillingClientId,
                Status = "draft",
                IssueDate = issueDate,
                ValidUntil = issueDate.AddDays(30),
                LineItemsJson = JsonSerializer.Serialize(input.Lines),
                TotalHt = ComputeTotal(input.Lines),
                Notes = input.Notes,
                CreatedAt = issueDate,
            };

            db.Quotes.Add(quote);
            await db.SaveChangesAsync();
            return Results.Created($"/api/admin/quotes/{quote.Id}", ToDetail(quote));
        });

        app.MapPut("/api/admin/quotes/{id:guid}", async (Guid id, QuoteInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();

            var quote = await db.Quotes.FindAsync(id);
            if (quote is null) return Results.NotFound();
            if (quote.Status != "draft") return Results.BadRequest(new { error = "Seul un devis brouillon peut être modifié." });

            quote.BillingClientId = input.BillingClientId;
            quote.LineItemsJson = JsonSerializer.Serialize(input.Lines);
            quote.TotalHt = ComputeTotal(input.Lines);
            quote.Notes = input.Notes;

            await db.SaveChangesAsync();
            return Results.Ok(ToDetail(quote));
        });

        app.MapDelete("/api/admin/quotes/{id:guid}", async (Guid id, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();

            var quote = await db.Quotes.FindAsync(id);
            if (quote is null) return Results.NotFound();
            if (quote.Status != "draft") return Results.BadRequest(new { error = "Seul un devis brouillon peut être supprimé." });

            db.Quotes.Remove(quote);
            await db.SaveChangesAsync();
            return Results.Ok();
        });

        app.MapPost("/api/admin/quotes/{id:guid}/send", async (Guid id, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();

            var quote = await db.Quotes.FindAsync(id);
            if (quote is null) return Results.NotFound();
            if (quote.Status != "draft") return Results.BadRequest(new { error = "Ce devis a déjà été envoyé." });

            quote.Status = "sent";
            await db.SaveChangesAsync();
            return Results.Ok(ToDetail(quote));
        });

        app.MapGet("/api/admin/quotes/{id:guid}/pdf", async (Guid id, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();

            var quote = await db.Quotes.FindAsync(id);
            if (quote is null) return Results.NotFound();
            var client = await db.BillingClients.FindAsync(quote.BillingClientId);
            if (client is null) return Results.NotFound();
            var company = await CompanyProfileEndpoints.GetOrCreateAsync(db);

            var bytes = new QuotePdfDocument(company, client, quote, ParseLines(quote.LineItemsJson)).GeneratePdf();
            return Results.File(bytes, "application/pdf", $"devis-{quote.Number}.pdf");
        });

        // --- Public : consultation + acceptation par le client, sans auth (lien envoyé par email) ---

        app.MapGet("/api/public/quotes/{id:guid}", async (Guid id, AppDbContext db) =>
        {
            var quote = await db.Quotes.FindAsync(id);
            if (quote is null || quote.Status is not ("sent" or "accepted")) return Results.NotFound();

            var client = await db.BillingClients.FindAsync(quote.BillingClientId);
            var company = await CompanyProfileEndpoints.GetOrCreateAsync(db);

            return Results.Ok(new
            {
                quote.Id,
                quote.Number,
                quote.Status,
                quote.IssueDate,
                quote.ValidUntil,
                Lines = ParseLines(quote.LineItemsJson),
                quote.TotalHt,
                quote.Notes,
                quote.AcceptedAt,
                ClientName = client?.Name ?? "",
                CompanyTradeName = company.TradeName,
                company.CgvUrl,
            });
        });

        app.MapPost("/api/public/quotes/{id:guid}/accept", async (Guid id, QuoteAcceptInput input, HttpRequest req, AppDbContext db) =>
        {
            var quote = await db.Quotes.FindAsync(id);
            if (quote is null) return Results.NotFound();
            if (quote.Status != "sent") return Results.BadRequest(new { error = "Ce devis n'est plus disponible pour acceptation." });
            if (quote.ValidUntil < DateTime.UtcNow) return Results.BadRequest(new { error = "Ce devis a expiré." });
            if (string.IsNullOrWhiteSpace(input.Name) || string.IsNullOrWhiteSpace(input.Email))
            {
                return Results.BadRequest(new { error = "Nom et email requis pour accepter le devis." });
            }

            quote.Status = "accepted";
            quote.AcceptedAt = DateTime.UtcNow;
            quote.AcceptedByName = input.Name;
            quote.AcceptedByEmail = input.Email;
            quote.AcceptedFromIp = req.HttpContext.Connection.RemoteIpAddress?.ToString();

            await db.SaveChangesAsync();
            return Results.Ok(new { quote.Status, quote.AcceptedAt });
        });
    }

    // Devis pas soumis à l'obligation légale de séquence sans trou (contrairement aux factures) —
    // simple MAX+1 par année, format "D-2026-0001".
    private static async Task<string> NextNumberAsync(AppDbContext db, int year)
    {
        var prefix = $"D-{year}-";
        var lastSeq = await db.Quotes
            .Where(q => q.Number.StartsWith(prefix))
            .Select(q => q.Number)
            .ToListAsync();

        var maxSeq = lastSeq
            .Select(n => int.TryParse(n.Substring(prefix.Length), out var seq) ? seq : 0)
            .DefaultIfEmpty(0)
            .Max();

        return $"{prefix}{(maxSeq + 1):D4}";
    }

    private static decimal ComputeTotal(List<QuoteLineDto> lines) => lines.Sum(l => l.Quantity * l.UnitPrice);

    private static List<QuoteLineDto> ParseLines(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new List<QuoteLineDto>();
        try
        {
            return JsonSerializer.Deserialize<List<QuoteLineDto>>(json) ?? new List<QuoteLineDto>();
        }
        catch (JsonException)
        {
            return new List<QuoteLineDto>();
        }
    }

    private static object ToListItem(Quote quote, Dictionary<Guid, string> clientNames) => new
    {
        quote.Id,
        quote.Number,
        quote.Status,
        quote.IssueDate,
        quote.ValidUntil,
        quote.TotalHt,
        quote.BillingClientId,
        ClientName = clientNames.GetValueOrDefault(quote.BillingClientId, "Client supprimé"),
    };

    private static object ToDetail(Quote quote) => new
    {
        quote.Id,
        quote.Number,
        quote.BillingClientId,
        quote.Status,
        quote.IssueDate,
        quote.ValidUntil,
        Lines = ParseLines(quote.LineItemsJson),
        quote.TotalHt,
        quote.Notes,
        quote.AcceptedAt,
        quote.AcceptedByName,
        quote.AcceptedByEmail,
        quote.CreatedAt,
    };
}

public record QuoteInput(Guid BillingClientId, List<QuoteLineDto> Lines, string Notes);
public record QuoteAcceptInput(string Name, string Email);
