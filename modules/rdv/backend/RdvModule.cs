using Backend;
using Microsoft.EntityFrameworkCore;

namespace Modules.Rdv;

public static class RdvModule
{
    public const string Name = "rdv";

    // Fenêtre glissante sur laquelle on génère des créneaux depuis le gabarit hebdomadaire — pas
    // configurable en V1 (rester simple, voir docs/12-plan-modules-restants.md).
    private const int ScheduleWindowDays = 21;

    public static void MapEndpoints(WebApplication app)
    {
        app.MapGet("/api/t/{clientSiteId:guid}/rdv/slots", async (Guid clientSiteId, AppDbContext db, ModuleRegistry registry) =>
        {
            if (!await registry.IsEnabledAsync(clientSiteId, Name)) return Results.NotFound();

            var schedule = await db.RdvSchedules.FirstOrDefaultAsync(s => s.ClientSiteId == clientSiteId);
            var bookedStarts = await GetBookedStartsAsync(db, clientSiteId);

            var slots = GenerateAvailableSlots(schedule, bookedStarts)
                .Select(s => new { startsAt = s.StartsAt, durationMinutes = s.DurationMinutes });

            return Results.Ok(slots);
        });

        app.MapPost("/api/t/{clientSiteId:guid}/rdv/bookings", async (Guid clientSiteId, BookingInput input, AppDbContext db, ModuleRegistry registry) =>
        {
            if (!await registry.IsEnabledAsync(clientSiteId, Name)) return Results.NotFound();

            await using var transaction = await db.Database.BeginTransactionAsync();

            var schedule = await db.RdvSchedules.FirstOrDefaultAsync(s => s.ClientSiteId == clientSiteId);
            var bookedStarts = await GetBookedStartsAsync(db, clientSiteId);

            // Recalcule la disponibilité au moment de la réservation (pas de confiance dans ce que
            // le client a affiché) : protège à la fois contre une horloge cliente périmée et contre
            // une double réservation concurrente sur le même créneau.
            var available = GenerateAvailableSlots(schedule, bookedStarts);
            if (schedule is null || !available.Any(s => s.StartsAt == input.StartsAt))
            {
                return Results.BadRequest(new { error = "Ce créneau n'est plus disponible, choisis-en un autre." });
            }

            var booking = new Booking
            {
                Id = Guid.NewGuid(),
                ClientSiteId = clientSiteId,
                StartsAt = input.StartsAt,
                DurationMinutes = schedule.SlotDurationMinutes,
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

    private static Task<List<DateTime>> GetBookedStartsAsync(AppDbContext db, Guid clientSiteId) =>
        db.Bookings
            .Where(b => b.ClientSiteId == clientSiteId && b.Status == "confirmed" && b.StartsAt > DateTime.UtcNow)
            .Select(b => b.StartsAt)
            .ToListAsync();

    // Découpe chaque jour actif du gabarit (StartTime..EndTime) en créneaux de SlotDurationMinutes,
    // ne garde que ceux dans le futur et pas déjà réservés. Utilisé à la fois pour l'affichage
    // public et pour revalider une réservation à la création.
    internal static List<(DateTime StartsAt, int DurationMinutes)> GenerateAvailableSlots(
        RdvSchedule? schedule, List<DateTime> bookedStarts)
    {
        var result = new List<(DateTime, int)>();
        if (schedule is null || schedule.SlotDurationMinutes <= 0) return result;

        var rules = RdvSchedule.ParseWeekdayRules(schedule.WeekdayRulesJson);
        var duration = TimeSpan.FromMinutes(schedule.SlotDurationMinutes);
        var now = DateTime.UtcNow;
        var booked = new HashSet<DateTime>(bookedStarts);

        for (var offset = 0; offset < ScheduleWindowDays; offset++)
        {
            var date = now.Date.AddDays(offset);
            // .NET DayOfWeek : Dimanche=0..Samedi=6 → conversion vers Lundi=0..Dimanche=6 (même
            // convention que SiteContent.OpeningHours/WEEKDAYS_SHORT).
            var dayOfWeek = ((int)date.DayOfWeek + 6) % 7;
            var rule = rules.FirstOrDefault(r => r.DayOfWeek == dayOfWeek);

            if (rule is null || !rule.Enabled) continue;
            if (!TimeSpan.TryParse(rule.StartTime, out var start) || !TimeSpan.TryParse(rule.EndTime, out var end)) continue;

            var cursor = date + start;
            var dayEnd = date + end;

            while (cursor + duration <= dayEnd)
            {
                if (cursor > now && !booked.Contains(cursor))
                {
                    result.Add((cursor, schedule.SlotDurationMinutes));
                }
                cursor += duration;
            }
        }

        return result;
    }
}

public record BookingInput(DateTime StartsAt, string CustomerName, string CustomerEmail, string CustomerPhone, string Note);
