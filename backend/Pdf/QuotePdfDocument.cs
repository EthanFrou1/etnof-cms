using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Backend;

// Génère le PDF d'un devis à la volée (pas de fichier stocké — voir docs/13-facturation-devis.md).
// Layout partagé en esprit avec InvoicePdfDocument mais volontairement dupliqué plutôt que
// factorisé prématurément (peu de code, deux documents légalement différents — voir CLAUDE.md
// règle 7 "rester simple").
public class QuotePdfDocument : IDocument
{
    private readonly CompanyProfile _company;
    private readonly BillingClient _client;
    private readonly Quote _quote;
    private readonly List<QuoteLineDto> _lines;

    public QuotePdfDocument(CompanyProfile company, BillingClient client, Quote quote, List<QuoteLineDto> lines)
    {
        _company = company;
        _client = client;
        _quote = quote;
        _lines = lines;
    }

    public DocumentMetadata GetMetadata() => DocumentMetadata.Default;
    public DocumentSettings GetSettings() => DocumentSettings.Default;

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
                col.Item().PaddingTop(4).Text(_company.CgvUrl.Length > 0 ? $"CGV disponibles sur {_company.CgvUrl}" : "").FontSize(8);
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
            });

            row.ConstantItem(200).Column(col =>
            {
                col.Item().AlignRight().Text($"DEVIS N° {_quote.Number}").FontSize(16).Bold();
                col.Item().AlignRight().Text($"Émis le {_quote.IssueDate:dd/MM/yyyy}");
                col.Item().AlignRight().Text($"Valable jusqu'au {_quote.ValidUntil:dd/MM/yyyy}");
                col.Item().PaddingTop(10).AlignRight().Text("Destinataire").SemiBold();
                col.Item().AlignRight().Text(_client.Name);
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

            col.Item().PaddingTop(12).AlignRight().Text($"Total HT : {_quote.TotalHt:0.00} €").FontSize(13).Bold();
            col.Item().AlignRight().Text(_company.VatMention).FontSize(9);

            if (_quote.Notes.Length > 0)
            {
                col.Item().PaddingTop(20).Text("Notes").SemiBold();
                col.Item().Text(_quote.Notes);
            }

            if (_quote.AcceptedAt is not null)
            {
                col.Item().PaddingTop(20).Background(Colors.Green.Lighten4).Padding(8).Text(
                    $"Devis accepté le {_quote.AcceptedAt:dd/MM/yyyy} par {_quote.AcceptedByName} ({_quote.AcceptedByEmail}).");
            }
        });
    }
}
