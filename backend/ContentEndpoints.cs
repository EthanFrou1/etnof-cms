using Microsoft.EntityFrameworkCore;

namespace Backend;

public static class ContentEndpoints
{
    public static void MapEndpoints(WebApplication app)
    {
        // Public : lu par le site du tenant pour afficher nom / description / offres.
        app.MapGet("/api/t/{clientSiteId:guid}/content", async (Guid clientSiteId, AppDbContext db) =>
        {
            var content = await db.SiteContents
                .Include(c => c.Offers)
                .FirstOrDefaultAsync(c => c.ClientSiteId == clientSiteId);
            return content is null ? Results.NotFound() : Results.Ok(content);
        });

        app.MapPut("/api/t/{clientSiteId:guid}/admin/content", async (Guid clientSiteId, SiteContentInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var content = await db.SiteContents
                .Include(c => c.Offers)
                .FirstOrDefaultAsync(c => c.ClientSiteId == clientSiteId);
            if (content is null) return Results.NotFound();

            content.SiteName = input.SiteName;
            content.Description = input.Description;
            content.EstablishmentName = input.EstablishmentName;
            content.EstablishmentType = input.EstablishmentType;
            content.Address = input.Address;
            content.Phone = input.Phone;

            db.Offers.RemoveRange(content.Offers);

            var newOffers = input.Offers
                .Select(o => new Offer
                {
                    Id = Guid.NewGuid(),
                    SiteContentId = content.Id,
                    Title = o.Title,
                    Price = o.Price,
                    Description = o.Description,
                })
                .ToList();

            // AddRange explicite : sans ça, EF Core voit un Id (Guid) déjà renseigné sur les nouvelles
            // entités et les traite comme "existantes" (UPDATE) plutôt que "nouvelles" (INSERT).
            db.Offers.AddRange(newOffers);
            content.Offers = newOffers;

            await db.SaveChangesAsync();
            return Results.Ok(content);
        });
    }
}

public record OfferInput(string Title, string Price, string Description);
public record SiteContentInput(
    string SiteName,
    string Description,
    List<OfferInput> Offers,
    string EstablishmentName,
    string EstablishmentType,
    string Address,
    string Phone
);
