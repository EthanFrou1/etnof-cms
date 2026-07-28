using Backend;
using Microsoft.EntityFrameworkCore;

namespace Modules.Rdv;

// Endpoints admin du module rdv (créneaux, réservations) — même pattern d'auth que
// CatalogueAdminEndpoints.cs (mot de passe du tenant ou mot de passe agence).
public static class RdvAdminEndpoints
{
    public static void MapEndpoints(WebApplication app)
    {
        var group = app.MapGroup("/api/t/{clientSiteId:guid}/admin/rdv");

        group.MapGet("/slots", async (Guid clientSiteId, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var slots = await db.TimeSlots
                .Where(s => s.ClientSiteId == clientSiteId)
                .OrderBy(s => s.StartsAt)
                .Include(s => s.Bookings)
                .ToListAsync();

            return Results.Ok(slots);
        });

        group.MapPost("/slots", async (Guid clientSiteId, TimeSlotInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            if (input.DurationMinutes <= 0)
            {
                return Results.BadRequest(new { error = "La durée doit être positive." });
            }

            var slot = new TimeSlot
            {
                Id = Guid.NewGuid(),
                ClientSiteId = clientSiteId,
                StartsAt = input.StartsAt,
                DurationMinutes = input.DurationMinutes,
                CreatedAt = DateTime.UtcNow,
            };

            db.TimeSlots.Add(slot);
            await db.SaveChangesAsync();

            return Results.Created($"/api/t/{clientSiteId}/admin/rdv/slots/{slot.Id}", slot);
        });

        // Un créneau réservé ne se supprime pas directement — il faut d'abord annuler la
        // réservation (PUT /bookings/{id}/status), pour ne jamais faire disparaître une réservation
        // confirmée sans que le client l'ait explicitement annulée.
        group.MapDelete("/slots/{id:guid}", async (Guid clientSiteId, Guid id, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var slot = await db.TimeSlots
                .Include(s => s.Bookings)
                .FirstOrDefaultAsync(s => s.ClientSiteId == clientSiteId && s.Id == id);
            if (slot is null) return Results.NotFound();

            if (slot.Bookings.Any(b => b.Status == "confirmed"))
            {
                return Results.BadRequest(new { error = "Ce créneau a une réservation confirmée — annule-la d'abord." });
            }

            db.TimeSlots.Remove(slot);
            await db.SaveChangesAsync();

            return Results.NoContent();
        });

        // Projection à plat (pas les entités brutes) : Booking.TimeSlot est [JsonIgnore] côté
        // entité (évite le cycle de sérialisation avec TimeSlot.Bookings, voir Booking.cs), donc
        // l'admin a besoin des horaires du créneau aplatis ici pour les afficher dans le tableau.
        group.MapGet("/bookings", async (Guid clientSiteId, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var bookings = await db.Bookings
                .Where(b => b.ClientSiteId == clientSiteId)
                .OrderBy(b => b.TimeSlot!.StartsAt)
                .Select(b => new
                {
                    b.Id,
                    b.CustomerName,
                    b.CustomerEmail,
                    b.CustomerPhone,
                    b.Note,
                    b.Status,
                    b.CreatedAt,
                    SlotStartsAt = b.TimeSlot!.StartsAt,
                    SlotDurationMinutes = b.TimeSlot!.DurationMinutes,
                })
                .ToListAsync();

            return Results.Ok(bookings);
        });

        group.MapPut("/bookings/{id:guid}/status", async (Guid clientSiteId, Guid id, BookingStatusInput input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            if (input.Status != "confirmed" && input.Status != "cancelled")
            {
                return Results.BadRequest(new { error = "Statut invalide." });
            }

            var booking = await db.Bookings
                .FirstOrDefaultAsync(b => b.ClientSiteId == clientSiteId && b.Id == id);
            if (booking is null) return Results.NotFound();

            booking.Status = input.Status;
            await db.SaveChangesAsync();

            return Results.Ok(booking);
        });
    }
}

public record TimeSlotInput(DateTime StartsAt, int DurationMinutes);
public record BookingStatusInput(string Status);
