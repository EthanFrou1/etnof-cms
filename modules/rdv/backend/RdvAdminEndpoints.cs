using Backend;
using Microsoft.EntityFrameworkCore;

namespace Modules.Rdv;

// Endpoints admin du module rdv (gabarit hebdomadaire, réservations) — même pattern d'auth que
// CatalogueAdminEndpoints.cs (mot de passe du tenant ou mot de passe agence).
public static class RdvAdminEndpoints
{
    public static void MapEndpoints(WebApplication app)
    {
        var group = app.MapGroup("/api/t/{clientSiteId:guid}/admin/rdv");

        group.MapGet("/schedule", async (Guid clientSiteId, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var schedule = await db.RdvSchedules.FirstOrDefaultAsync(s => s.ClientSiteId == clientSiteId);
            var days = schedule is null ? new List<WeekdayRuleDto>() : RdvSchedule.ParseWeekdayRules(schedule.WeekdayRulesJson);

            return Results.Ok(new RdvScheduleDto(schedule?.SlotDurationMinutes ?? 30, days));
        });

        group.MapPut("/schedule", async (Guid clientSiteId, RdvScheduleDto input, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            if (input.SlotDurationMinutes <= 0)
            {
                return Results.BadRequest(new { error = "La durée doit être positive." });
            }

            var schedule = await db.RdvSchedules.FirstOrDefaultAsync(s => s.ClientSiteId == clientSiteId);
            if (schedule is null)
            {
                schedule = new RdvSchedule { Id = Guid.NewGuid(), ClientSiteId = clientSiteId };
                db.RdvSchedules.Add(schedule);
            }

            schedule.SlotDurationMinutes = input.SlotDurationMinutes;
            schedule.WeekdayRulesJson = System.Text.Json.JsonSerializer.Serialize(input.Days);
            await db.SaveChangesAsync();

            return Results.Ok(input);
        });

        group.MapGet("/bookings", async (Guid clientSiteId, HttpRequest req, IConfiguration config, AppDbContext db) =>
        {
            if (!await TenantAdminAuth.IsAuthorizedAsync(req, config, db, clientSiteId)) return Results.Unauthorized();

            var bookings = await db.Bookings
                .Where(b => b.ClientSiteId == clientSiteId)
                .OrderBy(b => b.StartsAt)
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

public record BookingStatusInput(string Status);
