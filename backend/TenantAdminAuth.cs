namespace Backend;

// Auth pour l'admin d'UN tenant précis (/admin/{clientSiteId}). Le mot de passe (propre au tenant OU
// mot de passe agence, clé passe-partout pour le support) n'est vérifié qu'au login ; chaque requête
// suivante envoie le token signé émis à ce moment-là (voir AdminToken.cs). Un token "tenant" est lié
// au ClientSite.Id qui l'a émis — il ne peut pas servir pour un autre tenant. Voir AdminAuth.cs pour
// le mot de passe agence seul (utilisé par /api/admin/client-sites, /stats).
//
// Trois scopes possibles depuis l'ajout des comptes "Employé" (TenantAdminAccount, voir
// docs/07-admin-global.md) : "agency" (passe-partout Ethan) et "tenant" (mot de passe unique du
// tenant — le compte "Propriétaire", jamais dupliqué dans une table séparée) ont un accès complet ;
// "tenant-employee" (compte nommé, email+mot de passe propres) est volontairement plus restreint —
// voir IsOwnerAuthorizedAsync, utilisé par les endpoints sensibles (Modules, Paiement Stripe, gestion
// des comptes) au lieu de IsAuthorizedAsync.
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
            "tenant-employee" => siteId == clientSiteId,
            _ => false,
        });
    }

    // Même vérification que ci-dessus, mais refuse "tenant-employee" — réservé aux endpoints que
    // seul le Propriétaire (ou l'agence) doit pouvoir toucher.
    public static Task<bool> IsOwnerAuthorizedAsync(HttpRequest request, IConfiguration config, Guid clientSiteId)
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
