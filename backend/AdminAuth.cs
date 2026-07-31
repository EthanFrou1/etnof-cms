namespace Backend;

// Auth pour le dashboard agence (vue globale d'Ethan sur tous les tenants). Le mot de passe n'est
// vérifié qu'au login (POST /api/admin/login) ; chaque requête suivante envoie le token signé émis
// à ce moment-là (voir AdminToken.cs), avec une durée de vie d'1h — plus de mot de passe en clair
// renvoyé sur chaque appel.
public static class AdminAuth
{
    public static bool IsAuthorized(HttpRequest request, IConfiguration config)
    {
        var token = AdminToken.FromAuthorizationHeader(request);
        return AdminToken.TryValidate(config, token, out var scope, out _) && scope == "agency";
    }
}
