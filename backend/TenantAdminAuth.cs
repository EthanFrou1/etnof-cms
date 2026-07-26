using Microsoft.EntityFrameworkCore;

namespace Backend;

// Auth pour l'admin d'UN tenant précis (/admin/{clientSiteId}) : accepte le mot de passe propre du
// tenant, OU le mot de passe agence d'Ethan (clé passe-partout, utile pour le support client).
// Voir AdminAuth.cs pour le mot de passe agence seul (utilisé par /api/admin/client-sites, /stats).
public static class TenantAdminAuth
{
    public const string HeaderName = "X-Admin-Password";

    public static async Task<bool> IsAuthorizedAsync(HttpRequest request, IConfiguration config, AppDbContext db, Guid clientSiteId)
    {
        if (!request.Headers.TryGetValue(HeaderName, out var provided)) return false;
        var password = provided.ToString();

        if (AdminPasswordHasher.Verify(password, config["Admin:PasswordHash"])) return true;

        var tenantHash = await db.ClientSites
            .Where(c => c.Id == clientSiteId)
            .Select(c => c.PasswordHash)
            .FirstOrDefaultAsync();

        return AdminPasswordHasher.Verify(password, tenantHash);
    }
}
