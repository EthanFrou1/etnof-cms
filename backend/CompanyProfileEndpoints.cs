using Microsoft.EntityFrameworkCore;

namespace Backend;

// Config entreprise de l'agence (une seule ligne, pas de clientSiteId) — voir CompanyProfile.cs.
// Réservé à Ethan (AdminAuth), jamais exposé aux tenants.
public static class CompanyProfileEndpoints
{
    private static readonly string[] AllowedLogoExtensions = { ".jpg", ".jpeg", ".png", ".webp", ".svg" };
    private const long MaxLogoSizeBytes = 2 * 1024 * 1024;

    public static void MapEndpoints(WebApplication app)
    {
        app.MapGet("/api/admin/company-profile", async (HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();
            return Results.Ok(await GetOrCreateAsync(db));
        });

        app.MapPut("/api/admin/company-profile", async (CompanyProfileInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();

            var profile = await GetOrCreateAsync(db);
            profile.LegalName = input.LegalName;
            profile.TradeName = input.TradeName;
            profile.LegalForm = input.LegalForm;
            profile.Siret = input.Siret;
            profile.Address = input.Address;
            profile.Email = input.Email;
            profile.Phone = input.Phone;
            profile.VatMention = input.VatMention;
            profile.Iban = input.Iban;
            profile.Bic = input.Bic;
            profile.LatePaymentMention = input.LatePaymentMention;
            profile.CgvUrl = input.CgvUrl;
            profile.WebsiteUrl = input.WebsiteUrl;
            profile.UpdatedAt = DateTime.UtcNow;

            await db.SaveChangesAsync();
            return Results.Ok(profile);
        });

        app.MapPost("/api/admin/company-profile/logo", async (
            IFormFile file, HttpRequest req, IConfiguration config, AppDbContext db, IWebHostEnvironment env) =>
        {
            if (!AdminAuth.IsAuthorized(req, config)) return Results.Unauthorized();

            if (file.Length == 0) return Results.BadRequest(new { error = "Fichier vide." });
            if (file.Length > MaxLogoSizeBytes) return Results.BadRequest(new { error = "Logo trop volumineux (2 Mo max)." });

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedLogoExtensions.Contains(extension))
            {
                return Results.BadRequest(new { error = "Format non supporté (jpg, jpeg, png, webp, svg uniquement)." });
            }

            var webRoot = string.IsNullOrEmpty(env.WebRootPath)
                ? Path.Combine(env.ContentRootPath, "wwwroot")
                : env.WebRootPath;
            var uploadDir = Path.Combine(webRoot, "uploads", "agency", "logo");
            Directory.CreateDirectory(uploadDir);

            var fileName = $"{Guid.NewGuid()}{extension}";
            using var inputStream = new MemoryStream();
            await file.CopyToAsync(inputStream);
            await File.WriteAllBytesAsync(Path.Combine(uploadDir, fileName), ImageProcessing.ResizeAndCompress(inputStream.ToArray(), extension));

            var profile = await GetOrCreateAsync(db);
            profile.LogoPath = $"/uploads/agency/logo/{fileName}";
            profile.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            return Results.Ok(profile);
        }).DisableAntiforgery();
    }

    // Résout le chemin disque absolu du logo (null si aucun logo ou fichier manquant) — utilisé par
    // les endpoints qui génèrent les PDF de devis/factures pour l'afficher dans l'en-tête.
    public static string? ResolveLogoPath(CompanyProfile profile, IWebHostEnvironment env)
    {
        if (string.IsNullOrEmpty(profile.LogoPath)) return null;

        var webRoot = string.IsNullOrEmpty(env.WebRootPath)
            ? Path.Combine(env.ContentRootPath, "wwwroot")
            : env.WebRootPath;
        var fullPath = Path.Combine(webRoot, profile.LogoPath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
        return File.Exists(fullPath) ? fullPath : null;
    }

    // Une seule ligne, créée à la première lecture/écriture (même logique que le seed SiteContent
    // par tenant, mais ici il n'y a qu'un seul "tenant" possible : l'agence elle-même).
    public static async Task<CompanyProfile> GetOrCreateAsync(AppDbContext db)
    {
        var profile = await db.CompanyProfiles.FirstOrDefaultAsync();
        if (profile is not null) return profile;

        profile = new CompanyProfile { Id = Guid.NewGuid(), UpdatedAt = DateTime.UtcNow };
        db.CompanyProfiles.Add(profile);
        await db.SaveChangesAsync();
        return profile;
    }
}

public record CompanyProfileInput(
    string LegalName,
    string TradeName,
    string LegalForm,
    string Siret,
    string Address,
    string Email,
    string Phone,
    string VatMention,
    string Iban,
    string Bic,
    string LatePaymentMention,
    string CgvUrl,
    string WebsiteUrl
);
