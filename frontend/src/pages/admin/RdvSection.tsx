import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import { adminFetch } from "../../hooks/useAdminSession";

type WeekdayRule = {
  dayOfWeek: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
};

type Schedule = {
  slotDurationMinutes: number;
  days: WeekdayRule[];
};

type Booking = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  note: string;
  status: "confirmed" | "cancelled";
  createdAt: string;
  startsAt: string;
  durationMinutes: number;
};

type RdvSectionProps = {
  clientSiteId: string;
  password: string;
};

// Même ordre/libellés que WEEKDAYS dans EstablishmentSection.tsx (index 0 = lundi, cf.
// SiteContent.openingHours) — dupliqué ici plutôt qu'importé : pas de couplage entre modules.
const WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

const inputClass =
  "rounded-button border border-border-subtle bg-white px-3 py-2 text-sm text-navy placeholder:text-gray-text/60 focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20";

const timeInputClass = `${inputClass} w-[110px] min-w-0 disabled:cursor-not-allowed disabled:opacity-40`;

const statusBadgeClass: Record<Booking["status"], string> = {
  confirmed: "bg-green-accent/15 text-green-accent",
  cancelled: "bg-red-100 text-red-500",
};

const statusLabel: Record<Booking["status"], string> = {
  confirmed: "Confirmé",
  cancelled: "Annulé",
};

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// Tant qu'aucun planning n'a été enregistré, on travaille sur 7 jours "désactivés" plutôt qu'un
// tableau vide, pour que les lignes soient toujours affichées (même principe que
// normalizeHours dans EstablishmentSection.tsx).
function normalizeDays(days: WeekdayRule[]): WeekdayRule[] {
  return WEEKDAYS.map((_, index) => days.find((d) => d.dayOfWeek === index) ?? { dayOfWeek: index, enabled: false, startTime: "09:00", endTime: "18:00" });
}

function daysEqual(a: WeekdayRule[], b: WeekdayRule[]) {
  return (
    a.length === b.length &&
    a.every((d, i) => d.enabled === b[i].enabled && d.startTime === b[i].startTime && d.endTime === b[i].endTime)
  );
}

function SchedulePanel({ clientSiteId, password }: RdvSectionProps) {
  const [duration, setDuration] = useState("30");
  const [days, setDays] = useState<WeekdayRule[]>(normalizeDays([]));
  const [originalDuration, setOriginalDuration] = useState("30");
  const [originalDays, setOriginalDays] = useState<WeekdayRule[]>(normalizeDays([]));
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const load = () =>
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/rdv/schedule`, password)
      .then((res) => res.json())
      .then((data: Schedule) => {
        const normalized = normalizeDays(data.days);
        setDuration(String(data.slotDurationMinutes));
        setDays(normalized);
        setOriginalDuration(String(data.slotDurationMinutes));
        setOriginalDays(normalized);
        setLoaded(true);
      });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateDay = (index: number, patch: Partial<WeekdayRule>) =>
    setDays((current) => current.map((d, i) => (i === index ? { ...d, ...patch } : d)));

  const isDirty = duration !== originalDuration || !daysEqual(days, originalDays);

  const handleSave = async () => {
    setSaveStatus("saving");
    const res = await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/rdv/schedule`, password, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotDurationMinutes: Number(duration), days }),
    });

    if (res.ok) {
      setOriginalDuration(duration);
      setOriginalDays(days);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus((current) => (current === "saved" ? "idle" : current)), 1500);
    } else {
      setSaveStatus("idle");
    }
  };

  if (!loaded) return <section className="rounded-card bg-white p-6 shadow-card text-gray-text">Chargement…</section>;

  return (
    <section className="rounded-card bg-white p-6 shadow-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.05em] text-gray-text">
          Planning hebdomadaire
        </h3>
        <div className="flex items-center gap-3">
          {saveStatus === "saved" && <span className="text-sm text-green-accent">Enregistré</span>}
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || saveStatus === "saving"}
            className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saveStatus === "saving" ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>

      <label className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-text">
        Durée d'un rendez-vous
        <input
          type="number"
          min={5}
          step={5}
          className={`${inputClass} w-24`}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        />
        minutes
      </label>

      <div className="flex flex-col gap-3">
        {days.map((day, index) => (
          <div
            key={day.dayOfWeek}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border-subtle pb-3 last:border-0 last:pb-0"
          >
            <span className="w-24 shrink-0 text-sm font-semibold text-navy">{WEEKDAYS[index]}</span>
            <label className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-gray-text">
              <input
                type="checkbox"
                checked={day.enabled}
                onChange={(e) => updateDay(index, { enabled: e.target.checked })}
                className="h-4 w-4 accent-brand-mid"
              />
              Actif
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              <input
                type="time"
                disabled={!day.enabled}
                value={day.startTime}
                onChange={(e) => updateDay(index, { startTime: e.target.value })}
                className={timeInputClass}
              />
              <span className="text-gray-text/60">–</span>
              <input
                type="time"
                disabled={!day.enabled}
                value={day.endTime}
                onChange={(e) => updateDay(index, { endTime: e.target.value })}
                className={timeInputClass}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

type BookingFilter = "upcoming" | "past" | "cancelled" | "all";

const BOOKING_FILTERS: { value: BookingFilter; label: string }[] = [
  { value: "upcoming", label: "À venir" },
  { value: "past", label: "Passés" },
  { value: "cancelled", label: "Annulés" },
  { value: "all", label: "Tous" },
];

function matchesFilter(booking: Booking, filter: BookingFilter) {
  const isFuture = new Date(booking.startsAt).getTime() > Date.now();
  switch (filter) {
    case "upcoming":
      return booking.status === "confirmed" && isFuture;
    case "past":
      return booking.status === "confirmed" && !isFuture;
    case "cancelled":
      return booking.status === "cancelled";
    case "all":
      return true;
  }
}

const EMPTY_FILTER_LABEL: Record<BookingFilter, string> = {
  upcoming: "Aucun rendez-vous à venir.",
  past: "Aucun rendez-vous passé.",
  cancelled: "Aucun rendez-vous annulé.",
  all: "Aucune réservation pour l'instant.",
};

function BookingsPanel({ clientSiteId, password }: RdvSectionProps) {
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [filter, setFilter] = useState<BookingFilter>("upcoming");

  const load = () =>
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/rdv/bookings`, password)
      .then((res) => res.json())
      .then(setBookings);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancelBooking = async (id: string) => {
    await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/rdv/bookings/${id}/status`, password, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    load();
  };

  const filtered = (bookings ?? [])
    .filter((b) => matchesFilter(b, filter))
    .sort((a, b) => {
      const cmp = new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
      // Passés/Annulés/Tous : les plus récents d'abord (plus utile qu'un historique en ordre
      // chronologique) — seul "À venir" reste trié du plus proche au plus lointain.
      return filter === "upcoming" ? cmp : -cmp;
    });

  return (
    <section className="rounded-card bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 p-6 pb-0">
        <h3 className="text-sm font-semibold uppercase tracking-[0.05em] text-gray-text">
          Prochains rendez-vous
        </h3>
        <div className="flex flex-wrap gap-2">
          {BOOKING_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`rounded-pill px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                filter === option.value ? "bg-brand-gradient text-white" : "bg-bg-page-start text-gray-text hover:text-navy"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {!bookings ? (
        <p className="p-6 text-gray-text">Chargement…</p>
      ) : filtered.length === 0 ? (
        <p className="p-6 text-sm text-gray-text">{EMPTY_FILTER_LABEL[filter]}</p>
      ) : (
        <div className="overflow-x-auto p-6 pt-4">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-xs font-semibold uppercase tracking-[0.05em] text-gray-text">
                <th className="px-2 py-2 text-left">Créneau</th>
                <th className="px-2 py-2 text-left">Client</th>
                <th className="px-2 py-2 text-left">Contact</th>
                <th className="px-2 py-2 text-left">Statut</th>
                <th className="px-2 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((booking) => (
                <tr key={booking.id} className="border-b border-border-subtle last:border-0">
                  <td className="whitespace-nowrap px-2 py-3 text-gray-text">
                    {formatDateTime(booking.startsAt)}
                  </td>
                  <td className="px-2 py-3 font-medium text-navy">
                    {booking.customerName}
                    {booking.note && <div className="text-xs font-normal text-gray-text">{booking.note}</div>}
                  </td>
                  <td className="px-2 py-3 text-gray-text">
                    <div>{booking.customerPhone}</div>
                    <a href={`mailto:${booking.customerEmail}`} className="text-xs text-brand-mid hover:underline">
                      {booking.customerEmail}
                    </a>
                  </td>
                  <td className="px-2 py-3">
                    <span className={`rounded-pill px-2.5 py-1 text-xs font-semibold ${statusBadgeClass[booking.status]}`}>
                      {statusLabel[booking.status]}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    {booking.status === "confirmed" && (
                      <button
                        type="button"
                        onClick={() => cancelBooking(booking.id)}
                        className="text-sm font-medium text-red-500 hover:text-red-600"
                      >
                        Annuler
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function RdvSection({ clientSiteId, password }: RdvSectionProps) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold text-navy">Rendez-vous</h1>
      <SchedulePanel clientSiteId={clientSiteId} password={password} />
      <BookingsPanel clientSiteId={clientSiteId} password={password} />
    </div>
  );
}
