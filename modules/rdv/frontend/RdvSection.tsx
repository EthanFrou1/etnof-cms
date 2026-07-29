import { useEffect, useState, type CSSProperties, type FormEvent } from "react";

// Couleurs du template actif — voir docs/10-templates.md : un module reste isolé (ne dépend
// d'aucun import de frontend/src ou d'un autre module), donc redéclare localement cette forme
// plutôt que d'importer PaletteDef.
type ModulePalette = { accent: string; background: string; ink: string };

type RdvSectionProps = {
  apiBaseUrl: string;
  clientSiteId: string;
  palette: ModulePalette;
};

type TimeSlot = {
  startsAt: string;
  durationMinutes: number;
};

type FormState = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  note: string;
};

const initialForm: FormState = { customerName: "", customerEmail: "", customerPhone: "", note: "" };

const inputClass =
  "rounded-button border border-border-subtle bg-white px-4 py-2.5 placeholder:text-gray-text/60 focus:outline-none focus:ring-2 focus:border-[var(--module-accent)] focus:ring-[var(--module-accent)]/20";

const labelClass = "mt-2 text-xs font-semibold text-gray-text first:mt-0";

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function groupByDay(slots: TimeSlot[]) {
  const groups: { day: string; slots: TimeSlot[] }[] = [];
  for (const slot of slots) {
    const day = dayLabel(slot.startsAt);
    const group = groups.find((g) => g.day === day);
    if (group) group.slots.push(slot);
    else groups.push({ day, slots: [slot] });
  }
  return groups;
}

export default function RdvSection({ apiBaseUrl, clientSiteId, palette }: RdvSectionProps) {
  const [slots, setSlots] = useState<TimeSlot[] | null>(null);
  // Distinct de "slots vide" (voir RdvModule.cs) : un planning jamais configuré (aucun jour actif)
  // ne doit rien afficher sur le site public, contrairement à un planning réel temporairement
  // complet ("aucun créneau disponible" reste une information utile dans ce cas).
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [selectedStartsAt, setSelectedStartsAt] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const loadSlots = () =>
    fetch(`${apiBaseUrl}/api/t/${clientSiteId}/rdv/slots`)
      .then((res) => res.json())
      .then((data: { configured: boolean; slots: TimeSlot[] }) => {
        setConfigured(data.configured);
        setSlots(data.slots);
      });

  useEffect(() => {
    loadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedStartsAt) return;
    setStatus("sending");
    setErrorMessage("");

    try {
      const res = await fetch(`${apiBaseUrl}/api/t/${clientSiteId}/rdv/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt: selectedStartsAt, ...form }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setErrorMessage(body?.error ?? "Erreur d'envoi, réessaie.");
        setStatus("error");
        loadSlots();
        return;
      }

      setForm(initialForm);
      setSelectedStartsAt(null);
      setStatus("sent");
      loadSlots();
    } catch {
      setErrorMessage("Erreur d'envoi, réessaie.");
      setStatus("error");
    }
  };

  if (configured === false) return null;

  const groups = slots ? groupByDay(slots) : [];

  return (
    <section
      className="rounded-card bg-white p-8 shadow-card"
      style={{ "--module-accent": palette.accent } as CSSProperties}
    >
      <span className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: palette.accent }}>
        Rendez-vous
      </span>
      <h2 className="mb-5 mt-1 text-2xl font-extrabold" style={{ color: palette.ink }}>
        Réserver un créneau
      </h2>

      {!slots ? (
        <p className="text-sm text-gray-text">Chargement des créneaux…</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-gray-text">Aucun créneau disponible pour le moment.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <div key={group.day}>
              <span className="text-sm font-semibold capitalize" style={{ color: palette.ink }}>
                {group.day}
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {group.slots.map((slot) => {
                  const selected = selectedStartsAt === slot.startsAt;
                  return (
                    <button
                      key={slot.startsAt}
                      type="button"
                      onClick={() => {
                        setSelectedStartsAt(slot.startsAt);
                        setStatus("idle");
                      }}
                      className="rounded-button border px-3 py-2 text-sm font-medium transition-colors"
                      style={
                        selected
                          ? { backgroundColor: palette.accent, borderColor: palette.accent, color: "#FFFFFF" }
                          : { borderColor: "var(--module-accent)", color: palette.ink }
                      }
                    >
                      {timeLabel(slot.startsAt)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {selectedStartsAt && (
            <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-1.5 border-t border-border-subtle pt-4">
              <label htmlFor="rdv-name" className={labelClass}>
                Nom
              </label>
              <input
                id="rdv-name"
                className={inputClass}
                placeholder="Votre nom"
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                required
              />
              <label htmlFor="rdv-email" className={labelClass}>
                Email
              </label>
              <input
                id="rdv-email"
                type="email"
                className={inputClass}
                placeholder="vous@exemple.fr"
                value={form.customerEmail}
                onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                required
              />
              <label htmlFor="rdv-phone" className={labelClass}>
                Téléphone
              </label>
              <input
                id="rdv-phone"
                className={inputClass}
                placeholder="06 12 34 56 78"
                value={form.customerPhone}
                onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                required
              />
              <label htmlFor="rdv-note" className={labelClass}>
                Précision (facultatif)
              </label>
              <textarea
                id="rdv-note"
                className={inputClass}
                placeholder="Un détail à préciser ?"
                rows={2}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
              <button
                type="submit"
                disabled={status === "sending"}
                className="mt-4 rounded-button px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: palette.accent }}
              >
                Confirmer le rendez-vous
              </button>
              {status === "error" && <p className="mt-1 text-red-500">{errorMessage}</p>}
            </form>
          )}

          {status === "sent" && (
            <p className="mt-1" style={{ color: palette.accent }}>
              Rendez-vous confirmé !
            </p>
          )}
        </div>
      )}
    </section>
  );
}
