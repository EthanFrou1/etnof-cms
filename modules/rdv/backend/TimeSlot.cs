namespace Modules.Rdv;

public class TimeSlot
{
    public Guid Id { get; set; }
    public Guid ClientSiteId { get; set; }
    public DateTime StartsAt { get; set; }
    public int DurationMinutes { get; set; }
    public DateTime CreatedAt { get; set; }

    // Historique complet, pas juste la réservation active : une annulation garde sa ligne (comme
    // les commandes annulées du Catalogue) et le créneau peut être réservé à nouveau ensuite — donc
    // plusieurs Booking possibles pour un même créneau dans le temps, jamais plus d'un "confirmed".
    public List<Booking> Bookings { get; set; } = new();
}
