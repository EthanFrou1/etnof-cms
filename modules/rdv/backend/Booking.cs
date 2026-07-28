using System.Text.Json.Serialization;

namespace Modules.Rdv;

public class Booking
{
    public Guid Id { get; set; }
    public Guid ClientSiteId { get; set; }
    public Guid TimeSlotId { get; set; }

    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty;
    public string Note { get; set; } = string.Empty;

    // "confirmed" (réservé) ou "cancelled" (annulé par le client, le créneau redevient disponible) —
    // pas de "fulfilled" comme les commandes du Catalogue : un rendez-vous n'a pas d'étape de
    // traitement, il a juste lieu ou non à l'heure prévue.
    public string Status { get; set; } = "confirmed";
    public DateTime CreatedAt { get; set; }

    // [JsonIgnore] : sans ça, sérialiser TimeSlot.Bookings (qui inclut ce Booking, dont le TimeSlot
    // est refixé par EF Core) part en cycle infini — même pattern que ProductImage.Product. Gardée
    // pour trier/projeter dans RdvAdminEndpoints (GET /admin/rdv/bookings).
    [JsonIgnore]
    public TimeSlot? TimeSlot { get; set; }
}
