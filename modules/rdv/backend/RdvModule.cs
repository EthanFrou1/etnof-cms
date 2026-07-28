using Backend;
using Microsoft.EntityFrameworkCore;

namespace Modules.Rdv;

public static class RdvModule
{
    public const string Name = "rdv";

    public static void MapEndpoints(WebApplication app)
    {
        // Créneaux disponibles : futurs, pas encore réservés (pas de Booking "confirmed" associé).
        app.MapGet("/api/t/{clientSiteId:guid}/rdv/slots", async (Guid clientSiteId, AppDbContext db, ModuleRegistry registry) =>
        {
            if (!await registry.IsEnabledAsync(clientSiteId, Name)) return Results.NotFound();

            var slots = await db.TimeSlots
                .Where(s => s.ClientSiteId == clientSiteId
                    && s.StartsAt > DateTime.UtcNow
                    && !s.Bookings.Any(b => b.Status == "confirmed"))
                .OrderBy(s => s.StartsAt)
                .ToListAsync();

            return Results.Ok(slots);
        });

        app.MapPost("/api/t/{clientSiteId:guid}/rdv/bookings", async (Guid clientSiteId, BookingInput input, AppDbContext db, ModuleRegistry registry) =>
        {
            if (!await registry.IsEnabledAsync(clientSiteId, Name)) return Results.NotFound();

            await using var transaction = await db.Database.BeginTransactionAsync();

            var slot = await db.TimeSlots
                .Include(s => s.Bookings)
                .FirstOrDefaultAsync(s => s.ClientSiteId == clientSiteId && s.Id == input.TimeSlotId);

            if (slot is null) return Results.BadRequest(new { error = "Créneau introuvable." });
            if (slot.StartsAt <= DateTime.UtcNow) return Results.BadRequest(new { error = "Ce créneau n'est plus disponible." });
            if (slot.Bookings.Any(b => b.Status == "confirmed"))
            {
                return Results.BadRequest(new { error = "Ce créneau vient d'être réservé, choisis-en un autre." });
            }

            var booking = new Booking
            {
                Id = Guid.NewGuid(),
                ClientSiteId = clientSiteId,
                TimeSlotId = slot.Id,
                CustomerName = input.CustomerName,
                CustomerEmail = input.CustomerEmail,
                CustomerPhone = input.CustomerPhone,
                Note = input.Note,
                Status = "confirmed",
                CreatedAt = DateTime.UtcNow,
            };

            db.Bookings.Add(booking);
            await db.SaveChangesAsync();
            await transaction.CommitAsync();

            return Results.Created($"/api/t/{clientSiteId}/rdv/bookings/{booking.Id}", booking);
        });
    }
}

public record BookingInput(Guid TimeSlotId, string CustomerName, string CustomerEmail, string CustomerPhone, string Note);
