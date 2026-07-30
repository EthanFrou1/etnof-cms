using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

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

        var payload = new BrevoEmailRequest(
            Sender: new BrevoContact(senderName, senderEmail),
            To: new List<BrevoContact> { new(client.Name, client.Email) },
            Subject: $"Confirmation de paiement — Facture {invoice.Number}",
            HtmlContent: BuildInvoicePaidHtml(company, senderName, client, invoice, lines, publicUrl),
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

    // Gabarit HTML aux couleurs etnof-web (docs/09-charte-graphique.md) — mise en page par table +
    // styles inline (pas de balise <style>), seule approche fiable sur l'ensemble des clients mail.
    // Pas de dégradé CSS pour le bouton (peu/pas supporté par Outlook) : couleur pleine en repli.
    private static string BuildInvoicePaidHtml(
        CompanyProfile company, string senderName, BillingClient client, Invoice invoice, List<InvoiceLineDto> lines, string publicUrl)
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
              <h1 style=""margin:0 0 16px;font-size:24px;font-weight:800;color:{navy};"">Paiement confirmé</h1>
              <p style=""margin:0 0 24px;font-size:15px;line-height:1.6;color:{grayText};"">
                Bonjour {WebUtility.HtmlEncode(client.Name)},<br>
                Nous confirmons la réception de votre paiement. Vous trouverez la facture en pièce jointe de cet email.
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
                      Voir ma facture
                    </a>
                  </td>
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
    [property: JsonPropertyName("attachment")] List<BrevoAttachment> Attachment
);
