using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Backend;

// Token de session admin (remplace l'envoi du mot de passe en clair sur chaque requête, voir
// AdminAuth.cs / TenantAdminAuth.cs). Format : base64url(payload_json).base64url(HMACSHA256(payload)).
// Le payload porte le scope ("agency" = passe-partout Ethan, valide sur tous les tenants ; "tenant"
// = lié à un seul ClientSite.Id, infalsifiable sans le secret) et une expiration (1h par défaut).
public static class AdminToken
{
    private static readonly TimeSpan Ttl = TimeSpan.FromHours(1);

    // Si Admin:TokenSecret n'est pas configuré (dev), on génère un secret aléatoire en mémoire au
    // démarrage : évite une étape de setup obligatoire, au prix d'invalider les sessions à chaque
    // redémarrage du backend (acceptable vu la durée de vie courte du token).
    private static readonly string FallbackSecret = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));

    public static string Issue(IConfiguration config, string scope, Guid? siteId = null)
    {
        var exp = DateTimeOffset.UtcNow.Add(Ttl).ToUnixTimeSeconds();
        var payload = JsonSerializer.Serialize(new TokenPayload(scope, siteId, exp));
        var payloadBytes = Encoding.UTF8.GetBytes(payload);
        var signature = Sign(config, payloadBytes);

        return $"{Base64UrlEncode(payloadBytes)}.{Base64UrlEncode(signature)}";
    }

    public static long ExpiresAtUnixSeconds(string token)
    {
        var parts = token.Split('.');
        var payload = JsonSerializer.Deserialize<TokenPayload>(Base64UrlDecode(parts[0]))!;
        return payload.Exp;
    }

    public static bool TryValidate(IConfiguration config, string? token, out string scope, out Guid? siteId)
    {
        scope = "";
        siteId = null;
        if (string.IsNullOrEmpty(token)) return false;

        var parts = token.Split('.');
        if (parts.Length != 2) return false;

        byte[] payloadBytes, signature;
        try
        {
            payloadBytes = Base64UrlDecode(parts[0]);
            signature = Base64UrlDecode(parts[1]);
        }
        catch (FormatException)
        {
            return false;
        }

        var expectedSignature = Sign(config, payloadBytes);
        if (!CryptographicOperations.FixedTimeEquals(signature, expectedSignature)) return false;

        TokenPayload payload;
        try
        {
            payload = JsonSerializer.Deserialize<TokenPayload>(payloadBytes)!;
        }
        catch (JsonException)
        {
            return false;
        }

        if (DateTimeOffset.UtcNow.ToUnixTimeSeconds() > payload.Exp) return false;

        scope = payload.Scope;
        siteId = payload.SiteId;
        return true;
    }

    public static string? FromAuthorizationHeader(HttpRequest request)
    {
        if (!request.Headers.TryGetValue("Authorization", out var value)) return null;
        var header = value.ToString();
        return header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase) ? header["Bearer ".Length..] : null;
    }

    private static byte[] Sign(IConfiguration config, byte[] payloadBytes)
    {
        var secret = config["Admin:TokenSecret"];
        var key = Encoding.UTF8.GetBytes(string.IsNullOrEmpty(secret) ? FallbackSecret : secret);
        using var hmac = new HMACSHA256(key);
        return hmac.ComputeHash(payloadBytes);
    }

    private static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] Base64UrlDecode(string value)
    {
        var padded = value.Replace('-', '+').Replace('_', '/');
        padded += new string('=', (4 - padded.Length % 4) % 4);
        return Convert.FromBase64String(padded);
    }

    private record TokenPayload(string Scope, Guid? SiteId, long Exp);
}
