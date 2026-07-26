using Backend;
using Microsoft.EntityFrameworkCore;

namespace Modules.Catalogue;

public static class CatalogueModule
{
    public const string Name = "catalogue";

    public static void MapEndpoints(WebApplication app)
    {
        app.MapGet("/api/t/{clientSiteId:guid}/catalogue/products", async (Guid clientSiteId, AppDbContext db, ModuleRegistry registry) =>
        {
            if (!await registry.IsEnabledAsync(clientSiteId, Name)) return Results.NotFound();

            var products = await db.Products
                .Where(p => p.ClientSiteId == clientSiteId)
                .OrderByDescending(p => p.CreatedAt)
                .Include(p => p.Images.OrderBy(i => i.SortOrder))
                .ToListAsync();

            return Results.Ok(products);
        });

        app.MapGet("/api/t/{clientSiteId:guid}/catalogue/products/{id:guid}", async (Guid clientSiteId, Guid id, AppDbContext db, ModuleRegistry registry) =>
        {
            if (!await registry.IsEnabledAsync(clientSiteId, Name)) return Results.NotFound();

            var product = await db.Products
                .Where(p => p.ClientSiteId == clientSiteId && p.Id == id)
                .Include(p => p.Images.OrderBy(i => i.SortOrder))
                .FirstOrDefaultAsync();

            return product is null ? Results.NotFound() : Results.Ok(product);
        });

        app.MapPost("/api/t/{clientSiteId:guid}/catalogue/checkout", async (Guid clientSiteId, CheckoutInput input, AppDbContext db, ModuleRegistry registry) =>
        {
            if (!await registry.IsEnabledAsync(clientSiteId, Name)) return Results.NotFound();

            if (input.Items is null || input.Items.Count == 0)
            {
                return Results.BadRequest(new { error = "Le panier est vide." });
            }

            await using var transaction = await db.Database.BeginTransactionAsync();

            var email = input.CustomerEmail.Trim();
            var customer = await db.Customers.FirstOrDefaultAsync(c =>
                c.ClientSiteId == clientSiteId && c.Email.ToLower() == email.ToLower());

            if (customer is null)
            {
                customer = new Customer
                {
                    Id = Guid.NewGuid(),
                    ClientSiteId = clientSiteId,
                    Name = input.CustomerName,
                    Email = email,
                    CreatedAt = DateTime.UtcNow,
                };
                db.Customers.Add(customer);
            }

            var order = new Order
            {
                Id = Guid.NewGuid(),
                ClientSiteId = clientSiteId,
                CustomerId = customer.Id,
                CustomerName = input.CustomerName,
                CustomerEmail = email,
                Status = "pending",
                CreatedAt = DateTime.UtcNow,
            };

            decimal total = 0;

            foreach (var line in input.Items)
            {
                var product = await db.Products
                    .FirstOrDefaultAsync(p => p.ClientSiteId == clientSiteId && p.Id == line.ProductId);

                if (product is null)
                {
                    return Results.BadRequest(new { error = "Produit introuvable." });
                }

                if (line.Quantity <= 0 || product.Stock < line.Quantity)
                {
                    return Results.BadRequest(new { error = $"Stock insuffisant pour \"{product.Name}\" (disponible : {product.Stock})." });
                }

                product.Stock -= line.Quantity;

                var itemTotal = product.Price * line.Quantity;
                total += itemTotal;

                order.Items.Add(new OrderItem
                {
                    Id = Guid.NewGuid(),
                    OrderId = order.Id,
                    ProductId = product.Id,
                    ProductName = product.Name,
                    UnitPrice = product.Price,
                    Quantity = line.Quantity,
                });
            }

            order.Total = total;
            db.Orders.Add(order);
            await db.SaveChangesAsync();
            await transaction.CommitAsync();

            return Results.Ok(new { orderId = order.Id, total = order.Total });
        });
    }
}

public record CheckoutInput(string CustomerName, string CustomerEmail, List<CheckoutItemInput> Items);
public record CheckoutItemInput(Guid ProductId, int Quantity);
