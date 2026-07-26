namespace Backend;

// Auth "basique" volontairement minimale (un seul mot de passe partagé, pas de session/JWT — voir
// docs/05-roadmap-poc.md, bilan Phase 5). Le mot de passe est hashé (PBKDF2, AdminPasswordHasher)
// et envoyé en clair dans un header sur chaque requête admin ; la comparaison se fait contre le
// hash, jamais contre une valeur stockée en clair.
public static class AdminAuth
{
    public const string HeaderName = "X-Admin-Password";

    public static bool IsAuthorized(HttpRequest request, IConfiguration config)
    {
        var hash = config["Admin:PasswordHash"];
        return request.Headers.TryGetValue(HeaderName, out var provided)
            && AdminPasswordHasher.Verify(provided.ToString(), hash);
    }
}
