using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Modules.Catalogue;

namespace Backend;

// Envoi de l'email de confirmation de paiement via l'API transactionnelle Brevo (pas de SDK NuGet —
// un simple appel REST suffit, voir docs/13-facturation-devis.md pour la décision). Jamais de
// dépendance dure sur Brevo ailleurs dans le code : un seul point d'appel, ici.
public static class BrevoEmailService
{
    private const string EndpointUrl = "https://api.brevo.com/v3/smtp/email";

    public static async Task<bool> SendInvoicePaidEmailAsync(
        HttpClient http, string apiKey, CompanyProfile company, BillingClient client, Invoice invoice,
        List<InvoiceLineDto> lines, byte[] pdfBytes, string frontendBaseUrl)
    {
        if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(client.Email)) return false;

        var senderEmail = string.IsNullOrWhiteSpace(company.Email) ? "etnofweb@gmail.com" : company.Email;
        var senderName = string.IsNullOrWhiteSpace(company.TradeName) ? company.LegalName : company.TradeName;
        var publicUrl = $"{frontendBaseUrl.TrimEnd('/')}/facture/{invoice.Id}";

        var intro = $@"Bonjour {WebUtility.HtmlEncode(client.Name)},<br>
                Nous confirmons la réception de votre paiement. Vous trouverez la facture en pièce jointe de cet email.";

        var payload = new BrevoEmailRequest(
            Sender: new BrevoContact(senderName, senderEmail),
            To: new List<BrevoContact> { new(client.Name, client.Email) },
            Subject: $"Confirmation de paiement — Facture {invoice.Number}",
            HtmlContent: BuildInvoiceEmailHtml(company, senderName, invoice, lines, publicUrl, "Paiement confirmé", intro, "Voir ma facture"),
            Attachment: new List<BrevoAttachment> { new(Convert.ToBase64String(pdfBytes), $"facture-{invoice.Number}.pdf") }
        );

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, EndpointUrl);
            request.Headers.Add("api-key", apiKey);
            request.Headers.Add("Accept", "application/json");
            request.Content = JsonContent.Create(payload, options: JsonOptions);

            using var response = await http.SendAsync(request);
            return response.IsSuccessStatusCode;
        }
        catch (Exception)
        {
            // Ne remonte jamais — l'appelant (webhook Stripe) ne doit jamais échouer à cause d'un
            // problème d'envoi d'email : le paiement est déjà enregistré, c'est ce qui compte.
            return false;
        }
    }

    private static readonly Dictionary<string, string> InvoiceTypeLabels = new()
    {
        ["acompte"] = "Facture d'acompte",
        ["solde"] = "Facture de solde",
        ["unique"] = "Facture",
    };

    // Envoyée à la finalisation de la facture (voir InvoiceEndpoints.Finalize) — même gabarit que la
    // confirmation de paiement (charte graphique identique), CTA vers le paiement en ligne plutôt
    // qu'une simple consultation.
    public static async Task<bool> SendInvoiceSentEmailAsync(
        HttpClient http, string apiKey, CompanyProfile company, BillingClient client, Invoice invoice,
        List<InvoiceLineDto> lines, byte[] pdfBytes, string frontendBaseUrl)
    {
        if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(client.Email)) return false;

        var senderEmail = string.IsNullOrWhiteSpace(company.Email) ? "etnofweb@gmail.com" : company.Email;
        var senderName = string.IsNullOrWhiteSpace(company.TradeName) ? company.LegalName : company.TradeName;
        var publicUrl = $"{frontendBaseUrl.TrimEnd('/')}/facture/{invoice.Id}";
        var typeLabel = InvoiceTypeLabels.GetValueOrDefault(invoice.InvoiceType, "Facture");

        var intro = $@"Bonjour {WebUtility.HtmlEncode(client.Name)},<br>
                Vous trouverez ci-joint votre {typeLabel.ToLowerInvariant()}, à régler avant le {invoice.DueDate:dd/MM/yyyy}.
                Vous pouvez la payer en ligne en toute sécurité depuis le bouton ci-dessous.";

        var payload = new BrevoEmailRequest(
            Sender: new BrevoContact(senderName, senderEmail),
            To: new List<BrevoContact> { new(client.Name, client.Email) },
            Subject: $"{typeLabel} {invoice.Number} — {senderName}",
            HtmlContent: BuildInvoiceEmailHtml(company, senderName, invoice, lines, publicUrl, typeLabel, intro, "Payer ma facture en ligne", showSecureBadge: true),
            Attachment: new List<BrevoAttachment> { new(Convert.ToBase64String(pdfBytes), $"facture-{invoice.Number}.pdf") }
        );

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, EndpointUrl);
            request.Headers.Add("api-key", apiKey);
            request.Headers.Add("Accept", "application/json");
            request.Content = JsonContent.Create(payload, options: JsonOptions);

            using var response = await http.SendAsync(request);
            return response.IsSuccessStatusCode;
        }
        catch (Exception)
        {
            // Ne remonte jamais — l'appelant (finalisation de facture) ne doit jamais échouer à
            // cause d'un problème d'envoi d'email : la facture est déjà finalisée, c'est ce qui compte.
            return false;
        }
    }

    // Relance automatique J+7 après échéance dépassée (voir OverdueInvoiceReminderService.cs) — un
    // seul rappel, décision explicite d'Ethan (pas de séquence de relances multiples). Reprend la
    // mention légale de pénalités de retard déjà configurée (CompanyProfile.LatePaymentMention) pour
    // donner du poids au rappel sans avoir à la retaper.
    public static async Task<bool> SendInvoiceReminderEmailAsync(
        HttpClient http, string apiKey, CompanyProfile company, BillingClient client, Invoice invoice,
        List<InvoiceLineDto> lines, byte[] pdfBytes, string frontendBaseUrl)
    {
        if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(client.Email)) return false;

        var senderEmail = string.IsNullOrWhiteSpace(company.Email) ? "etnofweb@gmail.com" : company.Email;
        var senderName = string.IsNullOrWhiteSpace(company.TradeName) ? company.LegalName : company.TradeName;
        var publicUrl = $"{frontendBaseUrl.TrimEnd('/')}/facture/{invoice.Id}";

        var intro = $@"Bonjour {WebUtility.HtmlEncode(client.Name)},<br>
                Sauf erreur de notre part, la facture {WebUtility.HtmlEncode(invoice.Number ?? "")} n'est toujours pas réglée alors que
                son échéance ({invoice.DueDate:dd/MM/yyyy}) est dépassée. Vous pouvez la régler en ligne dès maintenant depuis le bouton
                ci-dessous.{(string.IsNullOrWhiteSpace(company.LatePaymentMention) ? "" : $@"<br><br><span style=""font-size:12px;"">{WebUtility.HtmlEncode(company.LatePaymentMention)}</span>")}";

        var payload = new BrevoEmailRequest(
            Sender: new BrevoContact(senderName, senderEmail),
            To: new List<BrevoContact> { new(client.Name, client.Email) },
            Subject: $"Rappel — Facture {invoice.Number} toujours impayée",
            HtmlContent: BuildInvoiceEmailHtml(company, senderName, invoice, lines, publicUrl, "Facture toujours impayée", intro, "Payer ma facture en ligne", showSecureBadge: true),
            Attachment: new List<BrevoAttachment> { new(Convert.ToBase64String(pdfBytes), $"facture-{invoice.Number}.pdf") }
        );

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, EndpointUrl);
            request.Headers.Add("api-key", apiKey);
            request.Headers.Add("Accept", "application/json");
            request.Content = JsonContent.Create(payload, options: JsonOptions);

            using var response = await http.SendAsync(request);
            return response.IsSuccessStatusCode;
        }
        catch (Exception)
        {
            // Ne remonte jamais — voir même remarque sur les autres envois d'email de ce fichier.
            return false;
        }
    }

    // Gabarit HTML aux couleurs etnof-web (docs/09-charte-graphique.md) — mise en page par table +
    // styles inline (pas de balise <style>), seule approche fiable sur l'ensemble des clients mail.
    // Pas de dégradé CSS pour le bouton (peu/pas supporté par Outlook) : couleur pleine en repli.
    // Header (badge + carte) et footer identiques entre tous les emails de facture — seuls le titre,
    // le texte d'intro et le libellé du bouton varient (voir SendInvoicePaidEmailAsync/SendInvoiceSentEmailAsync).
    private static string BuildInvoiceEmailHtml(
        CompanyProfile company, string senderName, Invoice invoice, List<InvoiceLineDto> lines, string publicUrl,
        string title, string introHtml, string ctaLabel, bool showSecureBadge = false)
    {
        const string navy = "#0F172A";
        const string greenAccent = "#22C55E";
        const string grayText = "#64748B";
        const string border = "#E2E8F0";
        const string bgPage = "#F8FAFC";
        const string brandMid = "#2563EB";
        const string fontFamily = "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,Helvetica,Arial,sans-serif";

        var lineRows = string.Join("", lines.Select(line => $@"
                <tr>
                  <td style=""padding:10px 0;border-bottom:1px solid {border};font-size:13px;color:{navy};"">{WebUtility.HtmlEncode(line.Label)}</td>
                  <td align=""right"" style=""padding:10px 0;border-bottom:1px solid {border};font-size:13px;color:{grayText};white-space:nowrap;"">{line.Quantity:0.##} × {line.UnitPrice:0.00} €</td>
                  <td align=""right"" style=""padding:10px 0 10px 12px;border-bottom:1px solid {border};font-size:13px;font-weight:700;color:{navy};white-space:nowrap;"">{(line.Quantity * line.UnitPrice):0.00} €</td>
                </tr>"));

        var footerLinks = string.Join(" · ", new[]
            {
                !string.IsNullOrWhiteSpace(company.WebsiteUrl) ? $@"<a href=""{company.WebsiteUrl}"" style=""color:{grayText};text-decoration:underline;"">{StripProtocol(company.WebsiteUrl)}</a>" : null,
                !string.IsNullOrWhiteSpace(company.Email) ? $@"<a href=""mailto:{company.Email}"" style=""color:{grayText};text-decoration:underline;"">{WebUtility.HtmlEncode(company.Email)}</a>" : null,
                !string.IsNullOrWhiteSpace(company.Phone) ? WebUtility.HtmlEncode(company.Phone) : null,
            }.Where(part => part is not null));

        return $@"
<body style=""margin:0;padding:32px 16px;background-color:{bgPage};font-family:{fontFamily};"">
  <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">
    <tr>
      <td align=""center"">
        <table role=""presentation"" width=""560"" cellpadding=""0"" cellspacing=""0"" style=""max-width:560px;width:100%;background-color:#FFFFFF;border-radius:20px;box-shadow:0 2px 12px rgba(15,23,42,0.05);"">
          <tr>
            <td style=""padding:40px;"">
              <div style=""text-transform:uppercase;letter-spacing:0.1em;font-size:13px;font-weight:600;color:{greenAccent};margin-bottom:8px;"">
                {WebUtility.HtmlEncode(senderName)}
              </div>
              <h1 style=""margin:0 0 16px;font-size:24px;font-weight:800;color:{navy};"">{WebUtility.HtmlEncode(title)}</h1>
              <p style=""margin:0 0 24px;font-size:15px;line-height:1.6;color:{grayText};"">
                {introHtml}
              </p>

              <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""margin-bottom:24px;"">
                <tr>
                  <td style=""padding-bottom:8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:{grayText};"">Récapitulatif</td>
                  <td></td>
                  <td></td>
                </tr>
                {lineRows}
                <tr>
                  <td colspan=""2"" style=""padding-top:14px;font-size:15px;font-weight:800;color:{navy};"">Total</td>
                  <td align=""right"" style=""padding-top:14px;font-size:15px;font-weight:800;color:{navy};white-space:nowrap;"">{invoice.TotalHt:0.00} €</td>
                </tr>
              </table>

              <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background-color:{bgPage};border-radius:12px;margin-bottom:24px;"">
                <tr>
                  <td style=""padding:16px 24px;"">
                    <div style=""font-size:12px;color:{grayText};margin-bottom:2px;"">Facture</div>
                    <div style=""font-size:16px;font-weight:800;color:{navy};"">{WebUtility.HtmlEncode(invoice.Number ?? "")}</div>
                  </td>
                </tr>
              </table>

              <table role=""presentation"" cellpadding=""0"" cellspacing=""0"">
                <tr>
                  <td style=""background-color:{brandMid};border-radius:12px;"">
                    <a href=""{publicUrl}"" style=""display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;"">
                      {WebUtility.HtmlEncode(ctaLabel)}
                    </a>
                  </td>
                </tr>
              </table>
              {(showSecureBadge ? $@"
              <p style=""margin:10px 0 0;font-size:12px;color:{grayText};"">🔒 Paiement sécurisé par Stripe</p>" : "")}

              <p style=""margin:32px 0 0;font-size:13px;line-height:1.6;color:{grayText};border-top:1px solid {border};padding-top:20px;"">
                Merci !<br>L'équipe {WebUtility.HtmlEncode(senderName)}
              </p>
            </td>
          </tr>
        </table>

        <table role=""presentation"" width=""560"" cellpadding=""0"" cellspacing=""0"" style=""max-width:560px;width:100%;"">
          <tr>
            <td align=""center"" style=""padding:20px 16px;font-size:12px;color:{grayText};"">
              {WebUtility.HtmlEncode(senderName)} · {footerLinks}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>";
    }

    private static string StripProtocol(string url) => url.Replace("https://", "").Replace("http://", "").TrimEnd('/');

    // Adresse de support agence — même identité que le fallback expéditeur utilisé plus haut pour
    // l'email de confirmation de paiement.
    private const string SupportInbox = "etnofweb@gmail.com";

    // Confirmation de commande du module Catalogue (voir modules/stripe/backend/StripeModule.cs,
    // webhook checkout.session.completed) — même compte Brevo partagé que le reste de ce fichier,
    // pas de compte par tenant (aucun tenant n'a le sien, voir docs/13-facturation-devis.md pour la
    // même décision côté facturation agence). L'expéditeur technique reste SupportInbox (seule
    // adresse vérifiée dans le compte Brevo), mais le nom affiché est celui du site du tenant et le
    // `replyTo` pointe vers son adresse de contact si renseignée — le client répond directement au
    // commerçant, pas à l'agence.
    public static async Task<bool> SendOrderConfirmationEmailAsync(
        HttpClient http, string apiKey, SiteContent site, Order order, List<OrderItem> items)
    {
        if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(order.CustomerEmail)) return false;

        var senderName = string.IsNullOrWhiteSpace(site.SiteName) ? "Votre boutique" : site.SiteName;

        var payload = new BrevoEmailRequest(
            Sender: new BrevoContact(senderName, SupportInbox),
            To: new List<BrevoContact> { new(order.CustomerName, order.CustomerEmail) },
            Subject: $"Confirmation de commande — {senderName}",
            HtmlContent: BuildOrderConfirmationHtml(site, senderName, order, items),
            ReplyTo: string.IsNullOrWhiteSpace(site.Email) ? null : new BrevoContact(senderName, site.Email)
        );

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, EndpointUrl);
            request.Headers.Add("api-key", apiKey);
            request.Headers.Add("Accept", "application/json");
            request.Content = JsonContent.Create(payload, options: JsonOptions);

            using var response = await http.SendAsync(request);
            return response.IsSuccessStatusCode;
        }
        catch (Exception)
        {
            // Ne remonte jamais — l'appelant (webhook Stripe) ne doit jamais échouer à cause d'un
            // problème d'envoi d'email : la commande est déjà enregistrée, c'est ce qui compte.
            return false;
        }
    }

    // Même gabarit visuel que BuildInvoiceEmailHtml (badge/carte/pied de page), simplifié : pas de
    // bouton CTA (aucune page de suivi de commande publique pour l'instant — limite V1 assumée, voir
    // docs/12-plan-modules-restants.md).
    private static string BuildOrderConfirmationHtml(SiteContent site, string senderName, Order order, List<OrderItem> items)
    {
        const string navy = "#0F172A";
        const string greenAccent = "#22C55E";
        const string grayText = "#64748B";
        const string border = "#E2E8F0";
        const string bgPage = "#F8FAFC";
        const string fontFamily = "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,Helvetica,Arial,sans-serif";

        var lineRows = string.Join("", items.Select(item => $@"
                <tr>
                  <td style=""padding:10px 0;border-bottom:1px solid {border};font-size:13px;color:{navy};"">{WebUtility.HtmlEncode(item.ProductName)}{(string.IsNullOrWhiteSpace(item.SizeLabel) ? "" : $" ({WebUtility.HtmlEncode(item.SizeLabel)})")}</td>
                  <td align=""right"" style=""padding:10px 0;border-bottom:1px solid {border};font-size:13px;color:{grayText};white-space:nowrap;"">{item.Quantity} × {item.UnitPrice:0.00} €</td>
                  <td align=""right"" style=""padding:10px 0 10px 12px;border-bottom:1px solid {border};font-size:13px;font-weight:700;color:{navy};white-space:nowrap;"">{(item.Quantity * item.UnitPrice):0.00} €</td>
                </tr>"));

        var footerParts = new[]
            {
                !string.IsNullOrWhiteSpace(site.Email) ? $@"<a href=""mailto:{site.Email}"" style=""color:{grayText};text-decoration:underline;"">{WebUtility.HtmlEncode(site.Email)}</a>" : null,
                !string.IsNullOrWhiteSpace(site.Phone) ? WebUtility.HtmlEncode(site.Phone) : null,
            }.Where(part => part is not null);
        var footerLine = string.Join(" · ", footerParts);

        return $@"
<body style=""margin:0;padding:32px 16px;background-color:{bgPage};font-family:{fontFamily};"">
  <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">
    <tr>
      <td align=""center"">
        <table role=""presentation"" width=""560"" cellpadding=""0"" cellspacing=""0"" style=""max-width:560px;width:100%;background-color:#FFFFFF;border-radius:20px;box-shadow:0 2px 12px rgba(15,23,42,0.05);"">
          <tr>
            <td style=""padding:40px;"">
              <div style=""text-transform:uppercase;letter-spacing:0.1em;font-size:13px;font-weight:600;color:{greenAccent};margin-bottom:8px;"">
                {WebUtility.HtmlEncode(senderName)}
              </div>
              <h1 style=""margin:0 0 16px;font-size:24px;font-weight:800;color:{navy};"">Commande confirmée</h1>
              <p style=""margin:0 0 24px;font-size:15px;line-height:1.6;color:{grayText};"">
                Bonjour {WebUtility.HtmlEncode(order.CustomerName)},<br>
                Merci pour votre commande ! Nous confirmons la réception de votre paiement.
              </p>

              <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""margin-bottom:24px;"">
                <tr>
                  <td style=""padding-bottom:8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:{grayText};"">Récapitulatif</td>
                  <td></td>
                  <td></td>
                </tr>
                {lineRows}
                <tr>
                  <td colspan=""2"" style=""padding-top:14px;font-size:15px;font-weight:800;color:{navy};"">Total</td>
                  <td align=""right"" style=""padding-top:14px;font-size:15px;font-weight:800;color:{navy};white-space:nowrap;"">{order.Total:0.00} €</td>
                </tr>
              </table>

              <p style=""margin:32px 0 0;font-size:13px;line-height:1.6;color:{grayText};border-top:1px solid {border};padding-top:20px;"">
                Merci !<br>L'équipe {WebUtility.HtmlEncode(senderName)}
              </p>
            </td>
          </tr>
        </table>

        <table role=""presentation"" width=""560"" cellpadding=""0"" cellspacing=""0"" style=""max-width:560px;width:100%;"">
          <tr>
            <td align=""center"" style=""padding:20px 16px;font-size:12px;color:{grayText};"">
              {WebUtility.HtmlEncode(senderName)}{(footerLine.Length > 0 ? $" · {footerLine}" : "")}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>";
    }

    // Message envoyé par un client depuis la bulle d'aide de son admin (SupportBubble.tsx) — pas de
    // pièce jointe, pas de mise en page facture, juste le nom du site + le message. Le `replyToEmail`
    // (facultatif, saisi par le client) part en `replyTo` pour qu'Ethan puisse répondre directement
    // depuis sa boîte mail sans avoir à recopier une adresse.
    public static async Task<bool> SendSupportRequestAsync(
        HttpClient http, string apiKey, string siteName, Guid clientSiteId, string message, string? replyToEmail)
    {
        if (string.IsNullOrWhiteSpace(apiKey)) return false;

        var payload = new BrevoEmailRequest(
            Sender: new BrevoContact("etnof-cms", SupportInbox),
            To: new List<BrevoContact> { new("Support etnof-web", SupportInbox) },
            Subject: $"[Support admin] {siteName}",
            HtmlContent: BuildSupportRequestHtml(siteName, clientSiteId, message, replyToEmail),
            ReplyTo: string.IsNullOrWhiteSpace(replyToEmail) ? null : new BrevoContact(siteName, replyToEmail)
        );

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, EndpointUrl);
            request.Headers.Add("api-key", apiKey);
            request.Headers.Add("Accept", "application/json");
            request.Content = JsonContent.Create(payload, options: JsonOptions);

            using var response = await http.SendAsync(request);
            return response.IsSuccessStatusCode;
        }
        catch (Exception)
        {
            return false;
        }
    }

    private static string BuildSupportRequestHtml(string siteName, Guid clientSiteId, string message, string? replyToEmail)
    {
        const string navy = "#0F172A";
        const string grayText = "#64748B";
        const string bgPage = "#F8FAFC";
        const string fontFamily = "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,Helvetica,Arial,sans-serif";
        var encodedMessage = WebUtility.HtmlEncode(message).Replace("\n", "<br>");

        return $@"
<body style=""margin:0;padding:32px 16px;background-color:{bgPage};font-family:{fontFamily};"">
  <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">
    <tr>
      <td align=""center"">
        <table role=""presentation"" width=""560"" cellpadding=""0"" cellspacing=""0"" style=""max-width:560px;width:100%;background-color:#FFFFFF;border-radius:20px;box-shadow:0 2px 12px rgba(15,23,42,0.05);"">
          <tr>
            <td style=""padding:40px;"">
              <h1 style=""margin:0 0 4px;font-size:22px;font-weight:800;color:{navy};"">Demande d'aide — {WebUtility.HtmlEncode(siteName)}</h1>
              <p style=""margin:0 0 24px;font-size:12px;color:{grayText};"">Site : {clientSiteId}{(string.IsNullOrWhiteSpace(replyToEmail) ? "" : $" · Répondre à : {WebUtility.HtmlEncode(replyToEmail)}")}</p>
              <p style=""margin:0;font-size:15px;line-height:1.6;color:{navy};"">{encodedMessage}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>";
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };
}

public record BrevoContact(string Name, string Email);
public record BrevoAttachment(string Content, string Name);
public record BrevoEmailRequest(
    [property: JsonPropertyName("sender")] BrevoContact Sender,
    [property: JsonPropertyName("to")] List<BrevoContact> To,
    [property: JsonPropertyName("subject")] string Subject,
    [property: JsonPropertyName("htmlContent")] string HtmlContent,
    [property: JsonPropertyName("attachment"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] List<BrevoAttachment>? Attachment = null,
    [property: JsonPropertyName("replyTo"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] BrevoContact? ReplyTo = null
);
