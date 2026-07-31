namespace Backend;

// Auth pour l'admin d'UN tenant précis (/admin/{clientSiteId}). Le mot de passe (propre au tenant OU
// mot de passe agence, clé passe-partout pour le support) n'est vérifié qu'au login ; chaque requête
// suivante envoie le token signé émis à ce moment-là (voir AdminToken.cs). Un token "tenant" est lié
// au ClientSite.Id qui l'a émis — il ne peut pas servir pour un autre tenant. Voir AdminAuth.cs pour
// le mot de passe agence seul (utilisé par /api/admin/client-sites, /stats).
public static class TenantAdminAuth
{
    public static Task<bool> IsAuthorizedAsync(HttpRequest request, IConfiguration config, AppDbContext db, Guid clientSiteId)
    {
        var token = AdminToken.FromAuthorizationHeader(request);
        if (!AdminToken.TryValidate(config, token, out var scope, out var siteId)) return Task.FromResult(false);

        return Task.FromResult(scope switch
        {
            "agency" => true,
            "tenant" => siteId == clientSiteId,
            _ => false,
        });
    }
}
