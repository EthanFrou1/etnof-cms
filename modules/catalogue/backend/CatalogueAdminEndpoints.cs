using Backend;
using Microsoft.EntityFrameworkCore;

namespace Modules.Catalogue;

// Endpoints admin du module catalogue (produits, photos, commandes) — même pattern d'auth que
// TenantAdminEndpoints.cs (mot de passe du tenant ou mot de passe agence).
public static class CatalogueAdminEndpoints
{
    private static readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png", ".webp" };
    private const long MaxImageSizeBytes = 5 * 1024 * 1024;

    public static void MapEndpoints(WebApplication app)
    {
        var group = app.MapGroup("/api/t/{clientSiteId:guid}/admin/catalogue");

        group.MapGet("/products", async (Guid clientSiteId, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var products = await db.Products
                .Where(p => p.ClientSiteId == clientSiteId)
                .OrderByDescending(p => p.CreatedAt)
                .Include(p => p.Images.OrderBy(i => i.SortOrder))
                .ToListAsync();

            return Results.Ok(products);
        });

        group.MapGet("/products/{id:guid}", async (Guid clientSiteId, Guid id, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var product = await db.Products
                .Where(p => p.ClientSiteId == clientSiteId && p.Id == id)
                .Include(p => p.Images.OrderBy(i => i.SortOrder))
                .FirstOrDefaultAsync();

            return product is null ? Results.NotFound() : Results.Ok(product);
        });

        group.MapPost("/products", async (Guid clientSiteId, ProductInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var product = new Product
            {
                Id = Guid.NewGuid(),
                ClientSiteId = clientSiteId,
                Name = input.Name,
                Description = input.Description,
                Price = input.Price,
                Stock = input.Stock,
                CreatedAt = DateTime.UtcNow,
            };

            db.Products.Add(product);
            await db.SaveChangesAsync();

            return Results.Created($"/api/t/{clientSiteId}/catalogue/products/{product.Id}", product);
        });

        group.MapPut("/products/{id:guid}", async (Guid clientSiteId, Guid id, ProductInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            // Include Images : sans ça, la réponse renverrait toujours "images": [] (navigation non
            // chargée), ce qui écraserait l'affichage des photos côté admin après un enregistrement
            // (ProductDetailPage.tsx remplace son state produit avec cette réponse).
            var product = await db.Products
                .Include(p => p.Images.OrderBy(i => i.SortOrder))
                .FirstOrDefaultAsync(p => p.ClientSiteId == clientSiteId && p.Id == id);
            if (product is null) return Results.NotFound();

            product.Name = input.Name;
            product.Description = input.Description;
            product.Price = input.Price;
            product.Stock = input.Stock;
            await db.SaveChangesAsync();

            return Results.Ok(product);
        });

        group.MapDelete("/products/{id:guid}", async (Guid clientSiteId, Guid id, HttpRequest req, IConfiguration config, AppDbContext db, IWebHostEnvironment env) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var product = await db.Products
                .Include(p => p.Images)
                .FirstOrDefaultAsync(p => p.ClientSiteId == clientSiteId && p.Id == id);
            if (product is null) return Results.NotFound();

            foreach (var image in product.Images)
            {
                DeleteImageFile(env, image.Path);
            }

            db.Products.Remove(product);
            await db.SaveChangesAsync();

            return Results.NoContent();
        });

        // .DisableAntiforgery() : endpoint API pur (auth par en-tête X-Admin-Password, pas de
        // cookies/formulaire HTML) — pas de jeton antiforgery à vérifier ici, contrairement au cas
        // par défaut d'ASP.NET Core 8 pour tout endpoint qui lit un IFormFile.
        group.MapPost("/products/{id:guid}/images", async (Guid clientSiteId, Guid id, IFormFile file, HttpRequest req, IConfiguration config, AppDbContext db, IWebHostEnvironment env) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var product = await db.Products.FirstOrDefaultAsync(p => p.ClientSiteId == clientSiteId && p.Id == id);
            if (product is null) return Results.NotFound();

            if (file.Length == 0) return Results.BadRequest(new { error = "Fichier vide." });
            if (file.Length > MaxImageSizeBytes) return Results.BadRequest(new { error = "Image trop volumineuse (5 Mo max)." });

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(extension))
            {
                return Results.BadRequest(new { error = "Format non supporté (jpg, jpeg, png, webp uniquement)." });
            }

            var webRoot = string.IsNullOrEmpty(env.WebRootPath)
                ? Path.Combine(env.ContentRootPath, "wwwroot")
                : env.WebRootPath;
            var uploadDir = Path.Combine(webRoot, "uploads", clientSiteId.ToString(), id.ToString());
            Directory.CreateDirectory(uploadDir);

            var fileName = $"{Guid.NewGuid()}{extension}";
            var filePath = Path.Combine(uploadDir, fileName);

            await using (var stream = File.Create(filePath))
            {
                await file.CopyToAsync(stream);
            }

            var maxSortOrder = await db.ProductImages
                .Where(i => i.ProductId == id)
                .Select(i => (int?)i.SortOrder)
                .MaxAsync() ?? -1;

            var image = new ProductImage
            {
                Id = Guid.NewGuid(),
                ProductId = id,
                Path = $"/uploads/{clientSiteId}/{id}/{fileName}",
                SortOrder = maxSortOrder + 1,
            };

            db.ProductImages.Add(image);
            await db.SaveChangesAsync();

            return Results.Created(image.Path, image);
        }).DisableAntiforgery();

        group.MapDelete("/images/{imageId:guid}", async (Guid clientSiteId, Guid imageId, HttpRequest req, IConfiguration config, AppDbContext db, IWebHostEnvironment env) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var image = await db.ProductImages
                .Include(i => i.Product)
                .Where(i => i.Id == imageId && i.Product!.ClientSiteId == clientSiteId)
                .FirstOrDefaultAsync();
            if (image is null) return Results.NotFound();

            DeleteImageFile(env, image.Path);
            db.ProductImages.Remove(image);
            await db.SaveChangesAsync();

            return Results.NoContent();
        });

        group.MapGet("/orders", async (Guid clientSiteId, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var orders = await db.Orders
                .Where(o => o.ClientSiteId == clientSiteId)
                .OrderByDescending(o => o.CreatedAt)
                .Include(o => o.Items)
                .ToListAsync();

            return Results.Ok(orders);
        });

        group.MapPut("/orders/{id:guid}/status", async (Guid clientSiteId, Guid id, OrderStatusInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            if (input.Status != "fulfilled" && input.Status != "cancelled" && input.Status != "pending")
            {
                return Results.BadRequest(new { error = "Statut invalide." });
            }

            await using var transaction = await db.Database.BeginTransactionAsync();

            var order = await db.Orders
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.ClientSiteId == clientSiteId && o.Id == id);
            if (order is null) return Results.NotFound();

            // Annulation : on restaure le stock consommé au moment de la commande (une seule
            // fois — si la commande était déjà annulée, on ne restaure pas deux fois).
            if (input.Status == "cancelled" && order.Status != "cancelled")
            {
                foreach (var item in order.Items)
                {
                    var product = await db.Products.FirstOrDefaultAsync(p => p.Id == item.ProductId);
                    if (product is not null) product.Stock += item.Quantity;
                }
            }

            order.Status = input.Status;
            await db.SaveChangesAsync();
            await transaction.CommitAsync();

            return Results.Ok(order);
        });

        group.MapGet("/customers", async (Guid clientSiteId, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var customers = await db.Customers
                .Where(c => c.ClientSiteId == clientSiteId)
                .OrderByDescending(c => c.CreatedAt)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Email,
                    c.Phone,
                    c.Address,
                    c.Notes,
                    c.CreatedAt,
                    OrderCount = db.Orders.Count(o => o.CustomerId == c.Id),
                    TotalSpent = db.Orders.Where(o => o.CustomerId == c.Id && o.Status != "cancelled").Sum(o => (decimal?)o.Total) ?? 0,
                    LastOrderAt = db.Orders.Where(o => o.CustomerId == c.Id).Max(o => (DateTime?)o.CreatedAt),
                })
                .ToListAsync();

            return Results.Ok(customers);
        });

        group.MapGet("/customers/{id:guid}", async (Guid clientSiteId, Guid id, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var customer = await db.Customers.FirstOrDefaultAsync(c => c.ClientSiteId == clientSiteId && c.Id == id);
            if (customer is null) return Results.NotFound();

            var orders = await db.Orders
                .Where(o => o.CustomerId == id)
                .OrderByDescending(o => o.CreatedAt)
                .Include(o => o.Items)
                .ToListAsync();

            return Results.Ok(new { customer, orders });
        });

        group.MapPost("/customers", async (Guid clientSiteId, CustomerInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var customer = new Customer
            {
                Id = Guid.NewGuid(),
                ClientSiteId = clientSiteId,
                Name = input.Name,
                Email = input.Email,
                Phone = input.Phone,
                Address = input.Address,
                Notes = input.Notes,
                CreatedAt = DateTime.UtcNow,
            };

            db.Customers.Add(customer);
            await db.SaveChangesAsync();

            return Results.Created($"/api/t/{clientSiteId}/admin/catalogue/customers/{customer.Id}", customer);
        });

        group.MapPut("/customers/{id:guid}", async (Guid clientSiteId, Guid id, CustomerInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var customer = await db.Customers.FirstOrDefaultAsync(c => c.ClientSiteId == clientSiteId && c.Id == id);
            if (customer is null) return Results.NotFound();

            customer.Name = input.Name;
            customer.Email = input.Email;
            customer.Phone = input.Phone;
            customer.Address = input.Address;
            customer.Notes = input.Notes;
            await db.SaveChangesAsync();

            return Results.Ok(customer);
        });
    }

    private static void DeleteImageFile(IWebHostEnvironment env, string relativePath)
    {
        var webRoot = string.IsNullOrEmpty(env.WebRootPath)
            ? Path.Combine(env.ContentRootPath, "wwwroot")
            : env.WebRootPath;
        var fullPath = Path.Combine(webRoot, relativePath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
        if (File.Exists(fullPath)) File.Delete(fullPath);
    }
}

public record ProductInput(string Name, string Description, decimal Price, int Stock);
public record OrderStatusInput(string Status);
public record CustomerInput(string Name, string Email, string Phone, string Address, string Notes);
