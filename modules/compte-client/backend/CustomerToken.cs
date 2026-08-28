using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Modules.CompteClient;

// Token de session client (module "compte-client") — même mécanisme que AdminToken.cs (backend/),
// dupliqué plutôt que réutilisé : la forme du payload diffère (CustomerId lié à un ClientSite précis,
// pas de notion de "scope" agence/tenant) et la durée de vie est volontairement bien plus longue (60
// jours : un client ne revient qu'occasionnellement, on ne veut pas lui redemander un lien de
// connexion à chaque visite — voir CompteClientModule.cs pour le flux complet).
// Format : base64url(payload_json).base64url(HMACSHA256(payload)) — infalsifiable sans le secret.
public static class CustomerToken
{
    private static readonly TimeSpan Ttl = TimeSpan.FromDays(60);

    // Même repli que AdminToken en dev si Admin:TokenSecret n'est pas configuré — un secret aléatoire
    // en mémoire au démarrage, au prix d'invalider les sessions client à chaque redémarrage du
    // backend en local (acceptable en dev, jamais en production où la vraie clé est configurée).
    private static readonly string FallbackSecret = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));

    public static string Issue(IConfiguration config, Guid clientSiteId, Guid customerId)
    {
        var exp = DateTimeOffset.UtcNow.Add(Ttl).ToUnixTimeSeconds();
        var payload = JsonSerializer.Serialize(new TokenPayload(clientSiteId, customerId, exp));
        var payloadBytes = Encoding.UTF8.GetBytes(payload);
        var signature = Sign(config, payloadBytes);

        return $"{Base64UrlEncode(payloadBytes)}.{Base64UrlEncode(signature)}";
    }

    public static bool TryValidate(IConfiguration config, string? token, Guid clientSiteId, out Guid customerId)
    {
        customerId = Guid.Empty;
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
        // Un token émis pour un tenant ne doit jamais servir sur un autre — même garde que le token
        // admin "tenant" (voir TenantAdminAuth.cs).
        if (payload.ClientSiteId != clientSiteId) return false;

        customerId = payload.CustomerId;
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

    private record TokenPayload(Guid ClientSiteId, Guid CustomerId, long Exp);
}
