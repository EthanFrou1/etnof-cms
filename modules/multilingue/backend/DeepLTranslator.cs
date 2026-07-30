using System.Text.Json;

namespace Modules.Multilingue;

// Traduction automatique via l'API DeepL — décision d'Ethan (2026-07-30), voir
// docs/12-plan-modules-restants.md. Dépendance externe payante validée explicitement avant de
// coder (règle 5 de CLAUDE.md) : clé configurée dans `DeepL:ApiKey` (voir appsettings.Development.json),
// jamais commitée. Le bouton "Traduire automatiquement" ne fait que préremplir le brouillon côté
// admin — il ne sauvegarde jamais tout seul, le client garde la main pour relire/corriger avant
// "Enregistrer".
public static class DeepLTranslator
{
    // Une clé API DeepL "free tier" se termine toujours par ":fx" et doit appeler l'endpoint
    // api-free.deepl.com plutôt que api.deepl.com (clé "Pro") — détecté automatiquement, pas besoin
    // d'une config séparée pour choisir l'endpoint.
    public static async Task<(List<string>? translated, string? error)> TranslateManyAsync(
        IHttpClientFactory httpFactory, string apiKey, List<string> texts, string targetLocale)
    {
        var indices = new List<int>();
        var nonEmpty = new List<string>();
        for (var i = 0; i < texts.Count; i++)
        {
            if (!string.IsNullOrWhiteSpace(texts[i]))
            {
                indices.Add(i);
                nonEmpty.Add(texts[i]);
            }
        }

        var result = texts.Select(_ => "").ToList();
        if (nonEmpty.Count == 0) return (result, null);

        var targetLang = targetLocale.ToUpperInvariant();
        var baseUrl = apiKey.EndsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";

        // FormUrlEncodedContent accepte plusieurs entrées "text" (une liste de paires, pas un
        // Dictionary qui n'autoriserait qu'une seule clé "text") — DeepL traduit tout en un seul
        // appel et renvoie les traductions dans le même ordre. L'authentification passe par un
        // header "Authorization: DeepL-Auth-Key ..." (l'ancienne méthode "auth_key" dans le corps du
        // formulaire est dépréciée par DeepL depuis novembre 2025 et renvoie 403).
        var form = new List<KeyValuePair<string, string>> { new("target_lang", targetLang) };
        foreach (var t in nonEmpty) form.Add(new("text", t));

        var client = httpFactory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/v2/translate")
        {
            Content = new FormUrlEncodedContent(form),
        };
        request.Headers.Add("Authorization", $"DeepL-Auth-Key {apiKey}");

        using var response = await client.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            return (null, $"DeepL a renvoyé une erreur ({(int)response.StatusCode}).");
        }

        using var doc = JsonDocument.Parse(body);
        var translations = doc.RootElement.GetProperty("translations")
            .EnumerateArray()
            .Select(t => t.GetProperty("text").GetString() ?? "")
            .ToList();

        for (var i = 0; i < indices.Count; i++) result[indices[i]] = translations[i];
        return (result, null);
    }
}
