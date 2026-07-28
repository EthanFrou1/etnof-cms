namespace Modules.AvisGoogle;

// Miroir local d'un avis Google (lecture seule côté Google — jamais de réponse ni de modification
// du texte). GoogleTime (horodatage Unix renvoyé par Google pour cet avis précis) sert de clé
// naturelle pour retrouver le même avis d'un rafraîchissement à l'autre, et ainsi conserver le choix
// `Selected` du client au lieu de le réinitialiser à chaque appel à l'API.
public class GoogleReview
{
    public Guid Id { get; set; }
    public Guid ClientSiteId { get; set; }
    public long GoogleTime { get; set; }
    public string AuthorName { get; set; } = string.Empty;
    public string? ProfilePhotoUrl { get; set; }
    public int Rating { get; set; }
    public string Text { get; set; } = string.Empty;
    public string RelativeTimeDescription { get; set; } = string.Empty;
    public bool Selected { get; set; }
    public DateTime FetchedAt { get; set; }
}
