using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;

namespace Backend;

// Voir AdminActionLog.cs pour le principe général. Ce fichier porte la logique de résolution de
// l'auteur + la dérivation du libellé d'action, partagées entre le middleware générique (écriture
// authentifiée classique, voir Program.cs) et les quelques endpoints qui doivent logguer à la main
// (la connexion elle-même : pas d'en-tête Authorization sur la requête de login, l'auteur n'est
// connu qu'une fois le token émis).
public static class AdminActionLogger
{
    private static readonly Regex TenantAdminPath = new(@"^/api/t/([0-9a-fA-F-]{36})/admin/(.+)$", RegexOptions.Compiled);

    // Segments de route qu'il ne vaut pas la peine de journaliser — le renouvellement silencieux de
    // session (toutes les 5 min d'activité) noierait complètement l'historique, et le message de la
    // bulle d'aide n'est pas vraiment une "action sur le site" mais un ticket de support.
    private static readonly HashSet<string> ExcludedFirstSegments = new() { "support" };

    private static readonly Dictionary<string, string> SegmentLabels = new()
    {
        ["content"] = "Contenu du site",
        ["template"] = "Mise en page du site",
        ["logo"] = "Logo du site",
        ["modules"] = "Modules",
        ["accounts"] = "Comptes",
        ["establishment"] = "Établissement",
        ["blog"] = "Blog",
        ["rdv"] = "Rendez-vous",
        ["newsletter"] = "Newsletter",
        ["avis-google"] = "Avis Google",
        ["stripe"] = "Paiement Stripe",
        ["multilingue"] = "Multilingue",
        ["galerie"] = "Galerie",
        ["pages"] = "Pages personnalisées",
        ["login"] = "Connexion",
    };

    private static readonly Dictionary<string, string> CatalogueSubLabels = new()
    {
        ["products"] = "Produits",
        ["orders"] = "Commandes",
        ["collections"] = "Collections",
    };

    private static readonly Dictionary<string, string> MethodVerbs = new()
    {
        ["POST"] = "Ajout",
        ["PUT"] = "Modification",
        ["DELETE"] = "Suppression",
    };

    // Tente de faire correspondre `path` au patron /api/t/{clientSiteId}/admin/{reste} — renvoie le
    // clientSiteId et le reste du chemin si ça matche et que ce n'est pas un segment exclu.
    public static (Guid ClientSiteId, string PathTail)? MatchTenantAdminPath(string path)
    {
        var match = TenantAdminPath.Match(path);
        if (!match.Success) return null;
        if (!Guid.TryParse(match.Groups[1].Value, out var clientSiteId)) return null;

        var rest = match.Groups[2].Value.TrimEnd('/');
        var firstSegment = rest.Split('/')[0];
        if (ExcludedFirstSegments.Contains(firstSegment)) return null;

        return (clientSiteId, rest);
    }

    public static string DescribeAction(string method, string restOfPath)
    {
        var segments = restOfPath.Split('/');
        var first = segments[0];

        var noun = first == "catalogue" && segments.Length > 1 && CatalogueSubLabels.TryGetValue(segments[1], out var sub)
            ? sub
            : SegmentLabels.TryGetValue(first, out var label)
                ? label
                : char.ToUpperInvariant(first[0]) + first[1..];

        if (first == "login") return "Connexion";

        var verb = MethodVerbs.GetValueOrDefault(method, method);
        return $"{verb} — {noun}";
    }

    // Résout qui a fait l'action à partir de l'en-tête Authorization — utilisé par le middleware
    // générique. `null` si le token est absent/invalide (ex. la requête de login elle-même, avant
    // qu'un token existe) : rien à logguer dans ce cas via cette voie.
    public static async Task<(string ActorType, string ActorLabel)?> ResolveActorAsync(AppDbContext db, IConfiguration config, HttpRequest request)
    {
        var token = AdminToken.FromAuthorizationHeader(request);
        if (!AdminToken.TryValidate(config, token, out var scope, out _, out var accountId)) return null;

        return await ResolveActorAsync(db, scope, accountId);
    }

    // Variante appelée directement par les endpoints qui loguent à la main (connexion, activation
    // d'invitation) — le scope/accountId viennent alors du token qu'on vient d'émettre, pas d'un
    // en-tête de requête entrante.
    public static async Task<(string ActorType, string ActorLabel)?> ResolveActorAsync(AppDbContext db, string scope, Guid? accountId)
    {
        switch (scope)
        {
            case "agency":
                return ("agency", "Agence (support)");
            case "tenant":
                return ("owner", "Propriétaire");
            case "tenant-employee" when accountId is not null:
                var account = await db.TenantAdminAccounts.FindAsync(accountId.Value);
                return account is null ? null : ("employee", $"{account.FirstName} {account.LastName}".Trim());
            default:
                return null;
        }
    }

    public static async Task LogAsync(AppDbContext db, Guid clientSiteId, string actorType, string actorLabel, string method, string path, string action, int statusCode)
    {
        db.AdminActionLogs.Add(new AdminActionLog
        {
            Id = Guid.NewGuid(),
            ClientSiteId = clientSiteId,
            ActorType = actorType,
            ActorLabel = actorLabel,
            Method = method,
            Path = path,
            Action = action,
            StatusCode = statusCode,
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
    }
}
