import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import { adminFetch } from "../../hooks/useAdminSession";

type TimeSlot = {
  id: string;
  startsAt: string;
  durationMinutes: number;
  bookings: { status: "confirmed" | "cancelled" }[];
};

type Booking = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  note: string;
  status: "confirmed" | "cancelled";
  createdAt: string;
  slotStartsAt: string;
  slotDurationMinutes: number;
};

type RdvSectionProps = {
  clientSiteId: string;
  password: string;
};

const inputClass =
  "rounded-button border border-border-subtle bg-white px-3 py-2 text-sm text-navy placeholder:text-gray-text/60 focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20";

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

function slotIsBooked(slot: TimeSlot) {
  return slot.bookings.some((b) => b.status === "confirmed");
}

function SlotsPanel({ clientSiteId, password }: RdvSectionProps) {
  const [slots, setSlots] = useState<TimeSlot[] | null>(null);
  const [startsAt, setStartsAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/rdv/slots`, password)
      .then((res) => res.json())
      .then(setSlots);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upcoming = (slots ?? []).filter((s) => new Date(s.startsAt).getTime() > Date.now());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const res = await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/rdv/slots`, password, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startsAt: new Date(startsAt).toISOString(),
        durationMinutes: Number(durationMinutes),
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Impossible de créer ce créneau.");
      return;
    }

    setStartsAt("");
    load();
  };

  const handleDelete = async (id: string) => {
    await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/rdv/slots/${id}`, password, { method: "DELETE" });
    load();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <section className="rounded-card bg-white p-6 shadow-card">
        {!slots ? (
          <p className="text-gray-text">Chargement…</p>
        ) : upcoming.length === 0 ? (
          <p className="text-sm text-gray-text">Aucun créneau à venir — ajoute-en un pour commencer.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {upcoming.map((slot) => {
              const booked = slotIsBooked(slot);
              return (
                <li
                  key={slot.id}
                  className="flex items-center justify-between gap-3 rounded-button bg-bg-page-start/60 p-4"
                >
                  <div>
                    <div className="font-semibold text-navy">{formatDateTime(slot.startsAt)}</div>
                    <div className="text-sm text-gray-text">{slot.durationMinutes} min</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-pill px-2.5 py-1 text-xs font-semibold ${
                        booked ? "bg-brand-mid/10 text-brand-mid" : "bg-green-accent/10 text-green-accent"
                      }`}
                    >
                      {booked ? "Réservé" : "Libre"}
                    </span>
                    {!booked && (
                      <button
                        type="button"
                        onClick={() => handleDelete(slot.id)}
                        className="text-sm font-medium text-red-500 hover:text-red-600"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-card bg-white p-6 shadow-card">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.05em] text-gray-text">
          Ajouter un créneau
        </h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-gray-text">
            Date et heure
            <input
              type="datetime-local"
              className={inputClass}
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-gray-text">
            Durée (minutes)
            <input
              type="number"
              min={5}
              step={5}
              className={inputClass}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              required
            />
          </label>
          <button
            type="submit"
            className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90"
          >
            Ajouter
          </button>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </form>
      </section>
    </div>
  );
}

function BookingsPanel({ clientSiteId, password }: RdvSectionProps) {
  const [bookings, setBookings] = useState<Booking[] | null>(null);

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

  return (
    <section className="rounded-card bg-white shadow-card">
      <h3 className="p-6 pb-0 text-sm font-semibold uppercase tracking-[0.05em] text-gray-text">
        Réservations
      </h3>
      {!bookings ? (
        <p className="p-6 text-gray-text">Chargement…</p>
      ) : bookings.length === 0 ? (
        <p className="p-6 text-sm text-gray-text">Aucune réservation pour l'instant.</p>
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
              {bookings.map((booking) => (
                <tr key={booking.id} className="border-b border-border-subtle last:border-0">
                  <td className="whitespace-nowrap px-2 py-3 text-gray-text">
                    {formatDateTime(booking.slotStartsAt)}
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
      <SlotsPanel clientSiteId={clientSiteId} password={password} />
      <BookingsPanel clientSiteId={clientSiteId} password={password} />
    </div>
  );
}
