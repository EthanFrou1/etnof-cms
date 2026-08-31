namespace Backend;

// Renouvellement de session — permet de prolonger un token tant que l'utilisateur reste actif,
// plutôt qu'une expiration fixe à 1h pile même en pleine utilisation (voir AdminToken.cs, Ttl). Le
// frontend (useAdminSession.ts) l'appelle au plus une fois toutes les 5 minutes, déclenché par une
// vraie activité (clic, frappe, scroll) — resté inactif, le token expire normalement au bout d'1h et
// l'utilisateur retombe sur l'écran de login (voir readSession côté frontend). Marche pour les trois
// scopes (agence, tenant Propriétaire, tenant Employé) : le nouveau token reprend exactement le même
// scope/site que l'ancien, cet endpoint ne fait que revalider puis réémettre.
public static class AdminTokenEndpoints
{
    public static void MapEndpoints(WebApplication app)
    {
        app.MapPost("/api/admin/refresh-token", (HttpRequest req, IConfiguration config) =>
        {
            var token = AdminToken.FromAuthorizationHeader(req);
            if (!AdminToken.TryValidate(config, token, out var scope, out var siteId, out var accountId)) return Results.Unauthorized();

            var newToken = AdminToken.Issue(config, scope, siteId, accountId);
            return Results.Ok(new { token = newToken, expiresAt = AdminToken.ExpiresAtUnixSeconds(newToken) });
        });
    }
}
