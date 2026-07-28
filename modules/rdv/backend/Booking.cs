namespace Modules.Rdv;

public class Booking
{
    public Guid Id { get; set; }
    public Guid ClientSiteId { get; set; }

    // Plus de créneau persistant à référencer (voir RdvSchedule) : l'heure et la durée sont figées
    // ici au moment de la réservation, comme un snapshot — cohérent même si le planning hebdomadaire
    // change ensuite.
    public DateTime StartsAt { get; set; }
    public int DurationMinutes { get; set; }

    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty;
    public string Note { get; set; } = string.Empty;

    // "confirmed" (réservé) ou "cancelled" (annulé par le client, le créneau redevient disponible) —
    // pas de "fulfilled" comme les commandes du Catalogue : un rendez-vous n'a pas d'étape de
    // traitement, il a juste lieu ou non à l'heure prévue.
    public string Status { get; set; } = "confirmed";
    public DateTime CreatedAt { get; set; }
}
