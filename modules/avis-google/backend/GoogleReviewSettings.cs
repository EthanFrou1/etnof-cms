namespace Modules.AvisGoogle;

// Une seule ligne par tenant (retrouvée par ClientSiteId, même convention que RdvSchedule) : la
// fiche Google Places liée, et le dernier instantané de note globale renvoyé par Google. Distincte
// des GoogleReview individuelles pour ne pas avoir à recalculer une moyenne côté site public à
// chaque affichage.
public class GoogleReviewSettings
{
    public Guid Id { get; set; }
    public Guid ClientSiteId { get; set; }
    public string PlaceId { get; set; } = string.Empty;
    public string PlaceName { get; set; } = string.Empty;
    public double? AverageRating { get; set; }
    public int? UserRatingsTotal { get; set; }
    public DateTime? LastFetchedAt { get; set; }
}
