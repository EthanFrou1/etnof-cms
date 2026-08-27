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
                .Include(p => p.Sizes.OrderBy(s => s.SortOrder))
                .ToListAsync();

            return Results.Ok(products);
        });

        group.MapGet("/products/{id:guid}", async (Guid clientSiteId, Guid id, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var product = await db.Products
                .Where(p => p.ClientSiteId == clientSiteId && p.Id == id)
                .Include(p => p.Images.OrderBy(i => i.SortOrder))
                .Include(p => p.Sizes.OrderBy(s => s.SortOrder))
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
                .Include(p => p.Sizes.OrderBy(s => s.SortOrder))
                .FirstOrDefaultAsync(p => p.ClientSiteId == clientSiteId && p.Id == id);
            if (product is null) return Results.NotFound();

            product.Name = input.Name;
            product.Description = input.Description;
            product.Price = input.Price;
            product.Stock = input.Stock;
            product.CollectionId = input.CollectionId;
            product.Highlighted = input.Highlighted;
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

        // Collections — regroupement simple des produits (0 ou 1 par produit, pas de tags multiples,
        // voir docs/04-catalogue-modules.md). CRUD minimal, même pattern d'auth que le reste du fichier.
        group.MapGet("/collections", async (Guid clientSiteId, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var collections = await db.Collections
                .Where(c => c.ClientSiteId == clientSiteId)
                .OrderBy(c => c.SortOrder)
                .ToListAsync();

            return Results.Ok(collections);
        });

        group.MapPost("/collections", async (Guid clientSiteId, CollectionInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            if (string.IsNullOrWhiteSpace(input.Name)) return Results.BadRequest(new { error = "Nom requis." });

            var maxSortOrder = await db.Collections
                .Where(c => c.ClientSiteId == clientSiteId)
                .Select(c => (int?)c.SortOrder)
                .MaxAsync() ?? -1;

            var collection = new Collection
            {
                Id = Guid.NewGuid(),
                ClientSiteId = clientSiteId,
                Name = input.Name.Trim(),
                SortOrder = maxSortOrder + 1,
            };

            db.Collections.Add(collection);
            await db.SaveChangesAsync();

            return Results.Created($"/api/t/{clientSiteId}/admin/catalogue/collections/{collection.Id}", collection);
        });

        group.MapPut("/collections/{id:guid}", async (Guid clientSiteId, Guid id, CollectionInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();
            if (string.IsNullOrWhiteSpace(input.Name)) return Results.BadRequest(new { error = "Nom requis." });

            var collection = await db.Collections.FirstOrDefaultAsync(c => c.Id == id && c.ClientSiteId == clientSiteId);
            if (collection is null) return Results.NotFound();

            collection.Name = input.Name.Trim();
            await db.SaveChangesAsync();

            return Results.Ok(collection);
        });

        // Réordonnancement par glisser-déposer (CollectionsSection.tsx), même patron que
        // /products/{id}/images/reorder : `collectionIds` = l'ordre voulu, complet (toutes les
        // collections du tenant). SortOrder réécrit d'après la position dans le tableau.
        group.MapPut("/collections/reorder", async (Guid clientSiteId, ReorderCollectionsInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var collections = await db.Collections
                .Where(c => c.ClientSiteId == clientSiteId)
                .ToListAsync();

            var currentIds = collections.Select(c => c.Id).ToHashSet();
            if (input.CollectionIds.Count != collections.Count || !input.CollectionIds.ToHashSet().SetEquals(currentIds))
            {
                return Results.BadRequest(new { error = "La liste doit contenir exactement les collections du tenant." });
            }

            for (var index = 0; index < input.CollectionIds.Count; index++)
            {
                collections.First(c => c.Id == input.CollectionIds[index]).SortOrder = index;
            }
            await db.SaveChangesAsync();

            return Results.Ok(collections.OrderBy(c => c.SortOrder));
        });

        group.MapDelete("/collections/{id:guid}", async (Guid clientSiteId, Guid id, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var collection = await db.Collections.FirstOrDefaultAsync(c => c.Id == id && c.ClientSiteId == clientSiteId);
            if (collection is null) return Results.NotFound();

            // Détache les produits plutôt que de dépendre d'une cascade implicite (CollectionId n'est
            // pas une FK stricte, voir Product.cs) — un produit rattaché ne doit jamais se retrouver
            // avec un CollectionId pointant sur une collection supprimée.
            await db.Products
                .Where(p => p.ClientSiteId == clientSiteId && p.CollectionId == id)
                .ExecuteUpdateAsync(setters => setters.SetProperty(p => p.CollectionId, (Guid?)null));

            db.Collections.Remove(collection);
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

            using var inputStream = new MemoryStream();
            await file.CopyToAsync(inputStream);
            await File.WriteAllBytesAsync(filePath, ImageProcessing.ResizeAndCompress(inputStream.ToArray(), extension));

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

        // Réordonnancement par glisser-déposer (ProductDetailPage.tsx) : `imageIds` = l'ordre voulu,
        // complet (toutes les photos du produit). SortOrder réécrit d'après la position dans le
        // tableau plutôt que d'accepter des valeurs arbitraires — évite les doublons/trous côté client.
        group.MapPut("/products/{id:guid}/images/reorder", async (Guid clientSiteId, Guid id, ReorderImagesInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var images = await db.ProductImages
                .Include(i => i.Product)
                .Where(i => i.ProductId == id && i.Product!.ClientSiteId == clientSiteId)
                .ToListAsync();
            if (images.Count == 0) return Results.NotFound();

            // Le nouvel ordre doit contenir exactement les mêmes photos que le produit — sinon on
            // refuse plutôt que de réordonner partiellement (état incohérent).
            var currentIds = images.Select(i => i.Id).ToHashSet();
            if (input.ImageIds.Count != images.Count || !input.ImageIds.ToHashSet().SetEquals(currentIds))
            {
                return Results.BadRequest(new { error = "La liste doit contenir exactement les photos du produit." });
            }

            for (var index = 0; index < input.ImageIds.Count; index++)
            {
                images.First(i => i.Id == input.ImageIds[index]).SortOrder = index;
            }
            await db.SaveChangesAsync();

            return Results.Ok(images.OrderBy(i => i.SortOrder));
        });

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

        // Tailles — facultatives (voir ProductSize.cs) : ajout/modification du stock/suppression,
        // plus réordonnancement manuel (même patron que /images/reorder et /collections/reorder).
        group.MapPost("/products/{id:guid}/sizes", async (Guid clientSiteId, Guid id, ProductSizeInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();
            if (string.IsNullOrWhiteSpace(input.Label)) return Results.BadRequest(new { error = "Taille requise." });

            var product = await db.Products.FirstOrDefaultAsync(p => p.ClientSiteId == clientSiteId && p.Id == id);
            if (product is null) return Results.NotFound();

            var maxSortOrder = await db.ProductSizes
                .Where(s => s.ProductId == id)
                .Select(s => (int?)s.SortOrder)
                .MaxAsync() ?? -1;

            var size = new ProductSize
            {
                Id = Guid.NewGuid(),
                ProductId = id,
                Label = input.Label.Trim(),
                Stock = Math.Max(0, input.Stock),
                SortOrder = maxSortOrder + 1,
            };

            db.ProductSizes.Add(size);
            await db.SaveChangesAsync();

            return Results.Created($"/api/t/{clientSiteId}/admin/catalogue/sizes/{size.Id}", size);
        });

        // `sizeIds` = l'ordre voulu, complet (toutes les tailles du produit) — SortOrder réécrit
        // d'après la position dans le tableau, même logique que le réordonnancement des photos.
        group.MapPut("/products/{id:guid}/sizes/reorder", async (Guid clientSiteId, Guid id, ReorderSizesInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var sizes = await db.ProductSizes
                .Include(s => s.Product)
                .Where(s => s.ProductId == id && s.Product!.ClientSiteId == clientSiteId)
                .ToListAsync();
            if (sizes.Count == 0) return Results.NotFound();

            var currentIds = sizes.Select(s => s.Id).ToHashSet();
            if (input.SizeIds.Count != sizes.Count || !input.SizeIds.ToHashSet().SetEquals(currentIds))
            {
                return Results.BadRequest(new { error = "La liste doit contenir exactement les tailles du produit." });
            }

            for (var index = 0; index < input.SizeIds.Count; index++)
            {
                sizes.First(s => s.Id == input.SizeIds[index]).SortOrder = index;
            }
            await db.SaveChangesAsync();

            return Results.Ok(sizes.OrderBy(s => s.SortOrder));
        });

        group.MapPut("/sizes/{sizeId:guid}", async (Guid clientSiteId, Guid sizeId, ProductSizeInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();
            if (string.IsNullOrWhiteSpace(input.Label)) return Results.BadRequest(new { error = "Taille requise." });

            var size = await db.ProductSizes
                .Include(s => s.Product)
                .FirstOrDefaultAsync(s => s.Id == sizeId && s.Product!.ClientSiteId == clientSiteId);
            if (size is null) return Results.NotFound();

            size.Label = input.Label.Trim();
            size.Stock = Math.Max(0, input.Stock);
            await db.SaveChangesAsync();

            return Results.Ok(size);
        });

        group.MapDelete("/sizes/{sizeId:guid}", async (Guid clientSiteId, Guid sizeId, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var size = await db.ProductSizes
                .Include(s => s.Product)
                .FirstOrDefaultAsync(s => s.Id == sizeId && s.Product!.ClientSiteId == clientSiteId);
            if (size is null) return Results.NotFound();

            db.ProductSizes.Remove(size);
            await db.SaveChangesAsync();

            return Results.NoContent();
        });

        // Toutes les avis d'un produit (approuvés ET en attente) — même pattern de modération que
        // modules/avis-google/backend/AvisGoogleAdminEndpoints.cs (Selected toggle par le client).
        group.MapGet("/products/{productId:guid}/reviews", async (Guid clientSiteId, Guid productId, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var reviews = await db.ProductReviews
                .Where(r => r.ClientSiteId == clientSiteId && r.ProductId == productId)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return Results.Ok(reviews);
        });

        group.MapPut("/reviews/{id:guid}", async (Guid clientSiteId, Guid id, SelectReviewInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var review = await db.ProductReviews.FirstOrDefaultAsync(r => r.Id == id && r.ClientSiteId == clientSiteId);
            if (review is null) return Results.NotFound();

            review.Selected = input.Selected;
            await db.SaveChangesAsync();
            return Results.Ok(review);
        });

        group.MapDelete("/reviews/{id:guid}", async (Guid clientSiteId, Guid id, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var review = await db.ProductReviews.FirstOrDefaultAsync(r => r.Id == id && r.ClientSiteId == clientSiteId);
            if (review is null) return Results.NotFound();

            db.ProductReviews.Remove(review);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // Demandes de réassort reçues pour ce produit (voir StockRequest.cs) — consultées depuis la
        // fiche produit, même patron que les avis (GET .../products/{productId}/reviews ci-dessus).
        group.MapGet("/products/{productId:guid}/stock-requests", async (Guid clientSiteId, Guid productId, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var requests = await db.StockRequests
                .Where(r => r.ClientSiteId == clientSiteId && r.ProductId == productId)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return Results.Ok(requests);
        });

        group.MapDelete("/stock-requests/{id:guid}", async (Guid clientSiteId, Guid id, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var request = await db.StockRequests.FirstOrDefaultAsync(r => r.Id == id && r.ClientSiteId == clientSiteId);
            if (request is null) return Results.NotFound();

            db.StockRequests.Remove(request);
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
                    var product = await db.Products.Include(p => p.Sizes).FirstOrDefaultAsync(p => p.Id == item.ProductId);
                    if (product is null) continue;

                    // Restaure le stock de la taille commandée si elle existe encore (voir
                    // ProductSize.cs) — sinon (taille supprimée depuis, ou produit sans taille) on
                    // retombe sur le stock global du produit, même comportement qu'avant les tailles.
                    var size = item.SizeLabel is null ? null : product.Sizes.FirstOrDefault(s => s.Label == item.SizeLabel);
                    if (size is not null) size.Stock += item.Quantity;
                    else product.Stock += item.Quantity;
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
                    c.AddressLine1,
                    c.AddressLine2,
                    c.PostalCode,
                    c.City,
                    c.Country,
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
                AddressLine1 = input.AddressLine1,
                AddressLine2 = input.AddressLine2,
                PostalCode = input.PostalCode,
                City = input.City,
                Country = input.Country,
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
            customer.AddressLine1 = input.AddressLine1;
            customer.AddressLine2 = input.AddressLine2;
            customer.PostalCode = input.PostalCode;
            customer.City = input.City;
            customer.Country = input.Country;
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

public record ProductInput(string Name, string Description, decimal Price, int Stock, Guid? CollectionId, bool Highlighted);
public record ReorderImagesInput(List<Guid> ImageIds);
public record ProductSizeInput(string Label, int Stock);
public record ReorderSizesInput(List<Guid> SizeIds);
public record CollectionInput(string Name);
public record ReorderCollectionsInput(List<Guid> CollectionIds);
public record OrderStatusInput(string Status);
public record CustomerInput(string Name, string Email, string Phone, string AddressLine1, string AddressLine2, string PostalCode, string City, string Country, string Notes);
public record SelectReviewInput(bool Selected);
