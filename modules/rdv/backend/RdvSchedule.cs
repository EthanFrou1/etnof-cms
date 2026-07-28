using System.Text.Json;

namespace Modules.Rdv;

// Une ligne par tenant : le gabarit hebdomadaire récurrent qui génère les créneaux disponibles
// (remplace les créneaux ponctuels créés un par un — voir docs/12-plan-modules-restants.md).
public class RdvSchedule
{
    public Guid Id { get; set; }
    public Guid ClientSiteId { get; set; }
    public int SlotDurationMinutes { get; set; } = 30;

    // JSON d'une liste de 7 WeekdayRuleDto (un par jour, DayOfWeek 0=lundi..6=dimanche — même
    // convention que SiteContent.OpeningHoursJson/WEEKDAYS_SHORT). Même principe de stockage
    // qu'OpeningHoursJson (voir ContentEndpoints.cs) : une colonne JSON plutôt qu'une table à part,
    // pour une petite structure toujours lue/écrite en bloc.
    public string WeekdayRulesJson { get; set; } = "[]";

    // Même principe que ContentEndpoints.ParseOpeningHours : jamais d'exception si la colonne
    // contient un JSON invalide/vide, on retombe sur une liste vide (tous les jours "non configurés").
    public static List<WeekdayRuleDto> ParseWeekdayRules(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<List<WeekdayRuleDto>>(json) ?? new List<WeekdayRuleDto>();
        }
        catch (JsonException)
        {
            return new List<WeekdayRuleDto>();
        }
    }
}

// StartTime/EndTime au format "HH:mm", comme DayHoursDto (ContentEndpoints.cs) — cohérent avec le
// reste du starter-kit plutôt qu'un TimeOnly typé, plus simple à sérialiser/afficher côté front.
public record WeekdayRuleDto(int DayOfWeek, bool Enabled, string StartTime, string EndTime);

public record RdvScheduleDto(int SlotDurationMinutes, List<WeekdayRuleDto> Days);
