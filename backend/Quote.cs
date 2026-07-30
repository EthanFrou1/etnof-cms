namespace Backend;

// Devis de l'agence envoyé à un BillingClient. Pas de contrainte légale de séquence sans trou
// (contrairement à Invoice.Number) — voir docs/13-facturation-devis.md.
public class Quote
{
    public Guid Id { get; set; }
    public string Number { get; set; } = string.Empty;
    public Guid BillingClientId { get; set; }

    // draft | sent | accepted | refused | expired
    public string Status { get; set; } = "draft";

    public DateTime IssueDate { get; set; }
    public DateTime ValidUntil { get; set; }

    // JSON sérialisé d'une liste de QuoteLineDto — même convention que SiteContent.OpeningHoursJson
    // (colonne texte brute, parsée/reformée à la frontière API, voir QuoteEndpoints.ParseLines).
    public string LineItemsJson { get; set; } = "[]";

    // Calculé et figé à l'enregistrement (même choix qu'Order.Total, module Catalogue), pas recalculé
    // à la lecture — évite qu'un devis déjà envoyé change de montant si le calcul évoluait un jour.
    public decimal TotalHt { get; set; }

    public string Notes { get; set; } = string.Empty;

    public DateTime? AcceptedAt { get; set; }
    public string? AcceptedByName { get; set; }
    public string? AcceptedByEmail { get; set; }
    public string? AcceptedFromIp { get; set; }

    public DateTime CreatedAt { get; set; }
}

public record QuoteLineDto(string Label, decimal Quantity, decimal UnitPrice);
