using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;

namespace Backend;

// Relance automatique des factures impayées — un seul rappel à J+7 après l'échéance dépassée
// (décision d'Ethan, voir docs/13-facturation-devis.md). Tâche de fond intégrée (BackgroundService
// natif .NET) plutôt qu'un service de scheduling externe type Hangfire : zéro dépendance
// supplémentaire (règle 5 de CLAUDE.md), suffisant tant qu'il n'y a qu'une seule instance backend.
public class OverdueInvoiceReminderService : BackgroundService
{
    private const int ReminderDelayDays = 7;
    private static readonly TimeSpan CheckInterval = TimeSpan.FromHours(6);

    private readonly IServiceProvider _services;
    private readonly ILogger<OverdueInvoiceReminderService> _logger;

    public OverdueInvoiceReminderService(IServiceProvider services, ILogger<OverdueInvoiceReminderService> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(CheckInterval);
        do
        {
            try
            {
                await SendDueRemindersAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                // Ne doit jamais arrêter le service — une erreur ponctuelle (Brevo down, etc.) se
                // rattrape au prochain passage, 6h plus tard.
                _logger.LogError(ex, "Échec de la vérification des factures en retard.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task SendDueRemindersAsync(CancellationToken ct)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var emailSettings = await AgencyEmailEndpoints.GetOrCreateAsync(db);
        if (string.IsNullOrWhiteSpace(emailSettings.BrevoApiKey)) return;

        // "sent" + échéance dépassée d'au moins ReminderDelayDays + jamais relancée : correspond
        // exactement au statut "En retard" affiché dans InvoicesSection.tsx, avec la garde
        // ReminderSentAt pour ne jamais envoyer deux fois le rappel unique voulu par Ethan.
        var cutoff = DateTime.UtcNow.AddDays(-ReminderDelayDays);
        var dueInvoices = await db.Invoices
            .Where(i => i.Status == "sent" && i.DueDate <= cutoff && i.ReminderSentAt == null)
            .ToListAsync(ct);

        if (dueInvoices.Count == 0) return;

        var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        var httpFactory = scope.ServiceProvider.GetRequiredService<IHttpClientFactory>();
        var env = scope.ServiceProvider.GetRequiredService<IWebHostEnvironment>();

        var company = await CompanyProfileEndpoints.GetOrCreateAsync(db);
        var logoPath = CompanyProfileEndpoints.ResolveLogoPath(company, env);
        var http = httpFactory.CreateClient();
        var frontendBaseUrl = config["Cors:AllowedOrigin"] ?? "http://localhost:5173";

        foreach (var invoice in dueInvoices)
        {
            var client = await db.BillingClients.FindAsync(new object?[] { invoice.BillingClientId }, ct);
            if (client is null) continue;

            var lines = InvoiceEndpoints.ParseLines(invoice.LineItemsJson);
            var pdfBytes = new InvoicePdfDocument(company, client, invoice, lines, logoPath).GeneratePdf();
            var sent = await BrevoEmailService.SendInvoiceReminderEmailAsync(
                http, emailSettings.BrevoApiKey, company, client, invoice, lines, pdfBytes, frontendBaseUrl);

            // Seulement posé si l'envoi a réussi : un échec temporaire (Brevo indisponible) sera
            // retenté au prochain passage plutôt que silencieusement abandonné — mais un client sans
            // email (SendInvoiceReminderEmailAsync renvoie false) sera retesté à chaque passage aussi,
            // sans conséquence puisque l'envoi échoue systématiquement de la même façon.
            if (sent)
            {
                invoice.ReminderSentAt = DateTime.UtcNow;
            }
        }

        await db.SaveChangesAsync(ct);
    }
}
