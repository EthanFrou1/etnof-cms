namespace Backend;

// Facture de l'agence. Number reste null tant que la facture est en brouillon — assigné uniquement
// à la finalisation (voir InvoiceEndpoints.Finalize), pour respecter l'obligation légale de
// séquence chronologique sans trou (docs/13-facturation-devis.md). Une fois finalisée, une facture
// n'est plus jamais modifiée/supprimée : IsFinalized verrouille les lignes et le numéro.
public class Invoice
{
    public Guid Id { get; set; }
    public string? Number { get; set; }
    public Guid BillingClientId { get; set; }
    public Guid? QuoteId { get; set; }

    // acompte | solde | unique
    public string InvoiceType { get; set; } = "unique";

    // draft | sent | paid | overdue | cancelled
    public string Status { get; set; } = "draft";

    public DateTime IssueDate { get; set; }
    public DateTime DueDate { get; set; }

    public string LineItemsJson { get; set; } = "[]";
    public decimal TotalHt { get; set; }
    public string Notes { get; set; } = string.Empty;

    public DateTime? PaidAt { get; set; }
    public bool IsFinalized { get; set; }

    // Idempotence du webhook Stripe (voir InvoicePaymentEndpoints.cs) — même rôle qu'Order.StripeSessionId
    // (module Catalogue/Stripe). Null tant qu'aucun paiement en ligne n'a été confirmé.
    public string? StripeSessionId { get; set; }

    // Posé après l'envoi réussi de l'email de confirmation (voir BrevoEmailService.cs) — évite un
    // double envoi si Stripe rejoue l'événement webhook, et trace visible dans l'admin.
    public DateTime? ConfirmationEmailSentAt { get; set; }

    // Posé après l'envoi réussi de l'email "nouvelle facture" à la finalisation (voir
    // InvoiceEndpoints.Finalize) — pas d'enjeu d'idempotence ici (la finalisation ne peut se
    // produire qu'une fois, verrouillée par IsFinalized), simple trace pour l'admin.
    public DateTime? SentEmailAt { get; set; }

    // Posé après l'envoi réussi de la relance automatique J+7 (voir OverdueInvoiceReminderService)
    // — sert de garde d'idempotence (jamais relancé deux fois, un seul rappel voulu par Ethan) autant
    // que de trace pour l'admin.
    public DateTime? ReminderSentAt { get; set; }

    public DateTime CreatedAt { get; set; }
}

public record InvoiceLineDto(string Label, decimal Quantity, decimal UnitPrice);
