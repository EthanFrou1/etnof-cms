using Microsoft.EntityFrameworkCore;

namespace Backend;

// CRUD des clients de facturation de l'agence — voir BillingClient.cs. Réservé à Ethan (AdminAuth).
public static class BillingClientEndpoints
{
    public static void MapEndpoints(WebApplication app)
    {
        app.MapGet("/api/admin/billing-clients", async (HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();
            var clients = await db.BillingClients.OrderByDescending(c => c.CreatedAt).ToListAsync();
            return Results.Ok(clients);
        });

        app.MapPost("/api/admin/billing-clients", async (BillingClientInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();
            if (string.IsNullOrWhiteSpace(input.Name)) return Results.BadRequest(new { error = "Le nom est requis." });

            var client = new BillingClient
            {
                Id = Guid.NewGuid(),
                ClientSiteId = input.ClientSiteId,
                Name = input.Name,
                IsCompany = input.IsCompany,
                Siret = input.Siret,
                Address = input.Address,
                Email = input.Email,
                Phone = input.Phone,
                Notes = input.Notes,
                CreatedAt = DateTime.UtcNow,
            };

            db.BillingClients.Add(client);
            await db.SaveChangesAsync();
            return Results.Created($"/api/admin/billing-clients/{client.Id}", client);
        });

        app.MapPut("/api/admin/billing-clients/{id:guid}", async (Guid id, BillingClientInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();

            var client = await db.BillingClients.FindAsync(id);
            if (client is null) return Results.NotFound();

            client.ClientSiteId = input.ClientSiteId;
            client.Name = input.Name;
            client.IsCompany = input.IsCompany;
            client.Siret = input.Siret;
            client.Address = input.Address;
            client.Email = input.Email;
            client.Phone = input.Phone;
            client.Notes = input.Notes;

            await db.SaveChangesAsync();
            return Results.Ok(client);
        });

        app.MapDelete("/api/admin/billing-clients/{id:guid}", async (Guid id, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();

            var client = await db.BillingClients.FindAsync(id);
            if (client is null) return Results.NotFound();

            db.BillingClients.Remove(client);
            await db.SaveChangesAsync();
            return Results.Ok();
        });
    }
}

public record BillingClientInput(
    Guid? ClientSiteId,
    string Name,
    bool IsCompany,
    string Siret,
    string Address,
    string Email,
    string Phone,
    string Notes
);
