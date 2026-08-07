using Backend;
using Microsoft.EntityFrameworkCore;

namespace Modules.Galerie;

// Endpoints admin — mêmes contraintes d'upload que backend/EstablishmentEndpoints.cs (extensions,
// taille max), auth par mot de passe tenant comme le reste de l'admin d'un module (voir
// modules/rdv/backend/RdvAdminEndpoints.cs). Pas de garde "module activé" côté admin (le client doit
// pouvoir gérer ses photos même avant d'activer publiquement le module).
public static class GalleryAdminEndpoints
{
    private static readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png", ".webp" };
    private const long MaxImageSizeBytes = 5 * 1024 * 1024;

    public static void MapEndpoints(WebApplication app)
    {
        var group = app.MapGroup("/api/t/{clientSiteId:guid}/admin/galerie");

        group.MapGet("/images", async (Guid clientSiteId, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var images = await db.GalleryImages
                .Where(i => i.ClientSiteId == clientSiteId)
                .OrderBy(i => i.SortOrder)
                .ToListAsync();

            return Results.Ok(images);
        });

        group.MapPost("/images", async (
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
            var uploadDir = Path.Combine(webRoot, "uploads", clientSiteId.ToString(), "gallery");
            Directory.CreateDirectory(uploadDir);

            var fileName = $"{Guid.NewGuid()}{extension}";
            using var inputStream = new MemoryStream();
            await file.CopyToAsync(inputStream);
            await File.WriteAllBytesAsync(Path.Combine(uploadDir, fileName), ImageProcessing.ResizeAndCompress(inputStream.ToArray(), extension));

            var nextSortOrder = (await db.GalleryImages
                .Where(i => i.ClientSiteId == clientSiteId)
                .Select(i => (int?)i.SortOrder)
                .MaxAsync() ?? -1) + 1;

            var image = new GalleryImage
            {
                Id = Guid.NewGuid(),
                ClientSiteId = clientSiteId,
                Path = $"/uploads/{clientSiteId}/gallery/{fileName}",
                SortOrder = nextSortOrder,
            };
            db.GalleryImages.Add(image);
            await db.SaveChangesAsync();

            return Results.Created(image.Path, image);
        }).DisableAntiforgery();

        group.MapDelete("/images/{imageId:guid}", async (
            Guid clientSiteId, Guid imageId, HttpRequest req, IConfiguration config, AppDbContext db, IWebHostEnvironment env) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var image = await db.GalleryImages.FirstOrDefaultAsync(i => i.Id == imageId && i.ClientSiteId == clientSiteId);
            if (image is null) return Results.NotFound();

            var webRoot = string.IsNullOrEmpty(env.WebRootPath)
                ? Path.Combine(env.ContentRootPath, "wwwroot")
                : env.WebRootPath;
            var filePath = Path.Combine(webRoot, image.Path.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
            if (File.Exists(filePath)) File.Delete(filePath);

            db.GalleryImages.Remove(image);
            await db.SaveChangesAsync();

            return Results.NoContent();
        });
    }
}
