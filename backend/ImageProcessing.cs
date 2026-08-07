using SkiaSharp;

namespace Backend;

// Redimensionne/recompresse une image avant stockage disque — jusqu'ici tous les uploads (produits,
// galerie, établissement, logo) écrivaient les octets bruts reçus du navigateur, ce qui pouvait
// stocker (et servir) des photos de smartphone à pleine résolution (3000-4000px). Voir
// docs/12-plan-modules-restants.md pour la décision d'ajouter SkiaSharp (licence MIT, déjà présente
// en dépendance transitive de QuestPDF, donc empreinte native marginale).
public static class ImageProcessing
{
    // Largeur/hauteur suffisante pour un affichage plein écran sur un site vitrine — pas besoin de
    // conserver une résolution "impression" que personne ne consultera jamais à cette taille.
    private const int MaxDimension = 1600;
    private const int JpegQuality = 82;
    private const int WebpQuality = 82;

    // Jamais appliqué aux SVG (vectoriel, rien à redimensionner). Réencode dans le MÊME format que
    // l'original pour ne jamais casser la transparence d'un PNG (une bascule vers JPEG la perdrait).
    // Si le décodage échoue (fichier corrompu, format non supporté par Skia), renvoie les octets
    // d'origine tels quels plutôt que de faire échouer tout l'upload.
    public static byte[] ResizeAndCompress(byte[] original, string extension)
    {
        if (extension.Equals(".svg", StringComparison.OrdinalIgnoreCase)) return original;

        using var bitmap = SKBitmap.Decode(original);
        if (bitmap is null) return original;

        var scale = Math.Min(1.0, (double)MaxDimension / Math.Max(bitmap.Width, bitmap.Height));
        var targetWidth = Math.Max(1, (int)Math.Round(bitmap.Width * scale));
        var targetHeight = Math.Max(1, (int)Math.Round(bitmap.Height * scale));

        using var toEncode = scale < 1.0
            ? bitmap.Resize(new SKImageInfo(targetWidth, targetHeight), SKSamplingOptions.Default)
            : bitmap;
        if (toEncode is null) return original;

        using var image = SKImage.FromBitmap(toEncode);
        var (format, quality) = extension.ToLowerInvariant() switch
        {
            ".png" => (SKEncodedImageFormat.Png, 100),
            ".webp" => (SKEncodedImageFormat.Webp, WebpQuality),
            _ => (SKEncodedImageFormat.Jpeg, JpegQuality),
        };

        using var data = image.Encode(format, quality);
        return data?.ToArray() ?? original;
    }
}
