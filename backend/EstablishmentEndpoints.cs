using Microsoft.EntityFrameworkCore;

namespace Backend;

// Photos de l'établissement, affichées dans le panneau résumé de la page Établissement de l'admin.
// Même pattern d'upload que modules/catalogue/backend/CatalogueAdminEndpoints.cs (photos produits).
public static class EstablishmentEndpoints
{
    private static readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png", ".webp" };
    private const long MaxImageSizeBytes = 5 * 1024 * 1024;

    public static void MapEndpoints(WebApplication app)
    {
        app.MapGet("/api/t/{clientSiteId:guid}/establishment/images", async (Guid clientSiteId, AppDbContext db) =>
        {
            var images = await db.EstablishmentImages
                .Where(i => i.ClientSiteId == clientSiteId)
                .OrderBy(i => i.SortOrder)
                .ToListAsync();

            return Results.Ok(images);
        });

        app.MapPost("/api/t/{clientSiteId:guid}/admin/establishment/images", async (
            Guid clientSiteId, IFormFile file, HttpRequest req, IConfiguration config, AppDbContext db, IWebHostEnvironment env) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

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
            var uploadDir = Path.Combine(webRoot, "uploads", clientSiteId.ToString(), "establishment");
            Directory.CreateDirectory(uploadDir);

            var fileName = $"{Guid.NewGuid()}{extension}";
            var filePath = Path.Combine(uploadDir, fileName);

            using var inputStream = new MemoryStream();
            await file.CopyToAsync(inputStream);
            await File.WriteAllBytesAsync(filePath, ImageProcessing.ResizeAndCompress(inputStream.ToArray(), extension));

            var maxSortOrder = await db.EstablishmentImages
                .Where(i => i.ClientSiteId == clientSiteId)
                .Select(i => (int?)i.SortOrder)
                .MaxAsync() ?? -1;

            var image = new EstablishmentImage
            {
                Id = Guid.NewGuid(),
                ClientSiteId = clientSiteId,
                Path = $"/uploads/{clientSiteId}/establishment/{fileName}",
                SortOrder = maxSortOrder + 1,
            };

            db.EstablishmentImages.Add(image);
            await db.SaveChangesAsync();

            return Results.Created(image.Path, image);
        }).DisableAntiforgery();

        app.MapDelete("/api/t/{clientSiteId:guid}/admin/establishment/images/{imageId:guid}", async (
            Guid clientSiteId, Guid imageId, HttpRequest req, IConfiguration config, AppDbContext db, IWebHostEnvironment env) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var image = await db.EstablishmentImages
                .FirstOrDefaultAsync(i => i.Id == imageId && i.ClientSiteId == clientSiteId);
            if (image is null) return Results.NotFound();

            var webRoot = string.IsNullOrEmpty(env.WebRootPath)
                ? Path.Combine(env.ContentRootPath, "wwwroot")
                : env.WebRootPath;
            var fullPath = Path.Combine(webRoot, image.Path.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
            if (File.Exists(fullPath)) File.Delete(fullPath);

            db.EstablishmentImages.Remove(image);
            await db.SaveChangesAsync();

            return Results.NoContent();
        });
    }
}
