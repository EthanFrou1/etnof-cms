using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Backend;

// Génère le PDF d'une facture à la volée. Voir QuotePdfDocument pour le layout jumeau (duplication
// volontaire, voir son commentaire) — celui-ci ajoute les mentions propres à une facture (numéro
// légal, échéance, pénalités de retard, IBAN).
public class InvoicePdfDocument : IDocument
{
    private readonly CompanyProfile _company;
    private readonly BillingClient _client;
    private readonly Invoice _invoice;
    private readonly List<InvoiceLineDto> _lines;

    public InvoicePdfDocument(CompanyProfile company, BillingClient client, Invoice invoice, List<InvoiceLineDto> lines)
    {
        _company = company;
        _client = client;
        _invoice = invoice;
        _lines = lines;
    }

    public DocumentMetadata GetMetadata() => DocumentMetadata.Default;
    public DocumentSettings GetSettings() => DocumentSettings.Default;

    private static readonly Dictionary<string, string> TypeLabels = new()
    {
        ["acompte"] = "Facture d'acompte",
        ["solde"] = "Facture de solde",
        ["unique"] = "Facture",
    };

    public void Compose(IDocumentContainer container)
    {
        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(2, Unit.Centimetre);
            page.DefaultTextStyle(x => x.FontSize(10));

            page.Header().Element(ComposeHeader);
            page.Content().Element(ComposeContent);
            page.Footer().Column(col =>
            {
                col.Item().PaddingTop(10).LineHorizontal(0.5f);
                col.Item().PaddingTop(4).Text(_company.LatePaymentMention).FontSize(8);
                if (_company.CgvUrl.Length > 0)
                {
                    col.Item().PaddingTop(2).Text($"CGV disponibles sur {_company.CgvUrl}").FontSize(8);
                }
            });
        });
    }

    private void ComposeHeader(IContainer container)
    {
        container.Row(row =>
        {
            row.RelativeItem().Column(col =>
            {
                col.Item().Text(_company.TradeName.Length > 0 ? _company.TradeName : _company.LegalName).FontSize(16).Bold();
                col.Item().Text(_company.LegalName);
                col.Item().Text(_company.LegalForm);
                col.Item().Text(_company.Address);
                if (_company.Siret.Length > 0) col.Item().Text($"SIRET : {_company.Siret}");
                if (_company.Email.Length > 0) col.Item().Text(_company.Email);
                if (_company.Phone.Length > 0) col.Item().Text(_company.Phone);
                if (_company.Iban.Length > 0) col.Item().PaddingTop(4).Text($"IBAN : {_company.Iban}").FontSize(9);
                if (_company.Bic.Length > 0) col.Item().Text($"BIC : {_company.Bic}").FontSize(9);
            });

            row.ConstantItem(200).Column(col =>
            {
                var typeLabel = TypeLabels.GetValueOrDefault(_invoice.InvoiceType, "Facture");
                col.Item().AlignRight().Text($"{typeLabel.ToUpperInvariant()} N° {_invoice.Number ?? "(brouillon)"}").FontSize(16).Bold();
                col.Item().AlignRight().Text($"Émise le {_invoice.IssueDate:dd/MM/yyyy}");
                col.Item().AlignRight().Text($"Échéance le {_invoice.DueDate:dd/MM/yyyy}");
                col.Item().PaddingTop(10).AlignRight().Text("Destinataire").SemiBold();
                col.Item().AlignRight().Text(_client.Name);
                if (_client.Siret.Length > 0) col.Item().AlignRight().Text($"SIRET : {_client.Siret}");
                if (_client.Address.Length > 0) col.Item().AlignRight().Text(_client.Address);
                if (_client.Email.Length > 0) col.Item().AlignRight().Text(_client.Email);
            });
        });
    }

    private void ComposeContent(IContainer container)
    {
        container.PaddingTop(20).Column(col =>
        {
            col.Item().Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.RelativeColumn(4);
                    columns.RelativeColumn(1);
                    columns.RelativeColumn(1.5f);
                    columns.RelativeColumn(1.5f);
                });

                table.Header(header =>
                {
                    header.Cell().Element(HeaderCell).Text("Désignation");
                    header.Cell().Element(HeaderCell).AlignRight().Text("Qté");
                    header.Cell().Element(HeaderCell).AlignRight().Text("Prix unitaire HT");
                    header.Cell().Element(HeaderCell).AlignRight().Text("Total HT");

                    static IContainer HeaderCell(IContainer c) =>
                        c.DefaultTextStyle(x => x.SemiBold()).PaddingVertical(6).BorderBottom(1).BorderColor(Colors.Grey.Darken1);
                });

                foreach (var line in _lines)
                {
                    table.Cell().Element(BodyCell).Text(line.Label);
                    table.Cell().Element(BodyCell).AlignRight().Text(line.Quantity.ToString("0.##"));
                    table.Cell().Element(BodyCell).AlignRight().Text($"{line.UnitPrice:0.00} €");
                    table.Cell().Element(BodyCell).AlignRight().Text($"{(line.Quantity * line.UnitPrice):0.00} €");

                    static IContainer BodyCell(IContainer c) =>
                        c.PaddingVertical(6).BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2);
                }
            });

            col.Item().PaddingTop(12).AlignRight().Text($"Total HT : {_invoice.TotalHt:0.00} €").FontSize(13).Bold();
            col.Item().AlignRight().Text(_company.VatMention).FontSize(9);

            if (_invoice.Notes.Length > 0)
            {
                col.Item().PaddingTop(20).Text("Notes").SemiBold();
                col.Item().Text(_invoice.Notes);
            }

            if (_invoice.Status == "paid")
            {
                col.Item().PaddingTop(20).Background(Colors.Green.Lighten4).Padding(8).Text(
                    $"Facture payée{(_invoice.PaidAt is not null ? $" le {_invoice.PaidAt:dd/MM/yyyy}" : "")}.");
            }
        });
    }
}
