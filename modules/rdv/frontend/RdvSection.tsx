import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
// Écart assumé à "un module reste isolé" (docs/02-architecture-modules.md) : import direct du
// dictionnaire i18n du module Multilingue plutôt que de dupliquer des chaînes ici — voir
// modules/multilingue/frontend/translations.ts.
import { t, localeTag, type Locale } from "@modules/multilingue/frontend/translations";

// Couleurs du template actif — voir docs/10-templates.md : un module reste isolé (ne dépend
// d'aucun import de frontend/src ou d'un autre module), donc redéclare localement cette forme
// plutôt que d'importer PaletteDef.
type ModulePalette = { accent: string; background: string; ink: string };

type RdvSectionProps = {
  apiBaseUrl: string;
  clientSiteId: string;
  palette: ModulePalette;
  locale?: Locale;
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

function dayLabel(iso: string, locale?: Locale) {
  return new Date(iso).toLocaleDateString(localeTag(locale), { weekday: "long", day: "numeric", month: "long" });
}

function shortDayLabel(iso: string, locale?: Locale) {
  return new Date(iso).toLocaleDateString(localeTag(locale), { weekday: "short", day: "numeric", month: "short" });
}

function timeLabel(iso: string, locale?: Locale) {
  return new Date(iso).toLocaleTimeString(localeTag(locale), { hour: "2-digit", minute: "2-digit" });
}

function groupByDay(slots: TimeSlot[], locale?: Locale) {
  const groups: { day: string; iso: string; slots: TimeSlot[] }[] = [];
  for (const slot of slots) {
    const day = dayLabel(slot.startsAt, locale);
    const group = groups.find((g) => g.day === day);
    if (group) group.slots.push(slot);
    else groups.push({ day, iso: slot.startsAt, slots: [slot] });
  }
  return groups;
}

export default function RdvSection({ apiBaseUrl, clientSiteId, palette, locale }: RdvSectionProps) {
  const [slots, setSlots] = useState<TimeSlot[] | null>(null);
  // Distinct de "slots vide" (voir RdvModule.cs) : un planning jamais configuré (aucun jour actif)
  // ne doit rien afficher sur le site public, contrairement à un planning réel temporairement
  // complet ("aucun créneau disponible" reste une information utile dans ce cas).
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [selectedStartsAt, setSelectedStartsAt] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
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
        setErrorMessage(body?.error ?? t(locale, "rdv.genericError"));
        setStatus("error");
        loadSlots();
        return;
      }

      setForm(initialForm);
      setSelectedStartsAt(null);
      setStatus("sent");
      loadSlots();
    } catch {
      setErrorMessage(t(locale, "rdv.genericError"));
      setStatus("error");
    }
  };

  if (configured === false) return null;

  const groups = slots ? groupByDay(slots, locale) : [];
  const activeDay = selectedDay ?? groups[0]?.day ?? null;
  const activeGroup = groups.find((g) => g.day === activeDay) ?? null;

  return (
    <section
      className="rounded-card bg-white p-8 shadow-card"
      style={{ "--module-accent": palette.accent } as CSSProperties}
    >
      <span className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: palette.accent }}>
        {t(locale, "rdv.label")}
      </span>
      <h2 className="mb-5 mt-1 text-2xl font-extrabold" style={{ color: palette.ink }}>
        {t(locale, "rdv.title")}
      </h2>

      {!slots ? (
        <p className="text-sm text-gray-text">{t(locale, "rdv.loading")}</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-gray-text">{t(locale, "rdv.noSlots")}</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {groups.map((group) => {
              const selected = group.day === activeDay;
              return (
                <button
                  key={group.day}
                  type="button"
                  onClick={() => {
                    setSelectedDay(group.day);
                    setSelectedStartsAt(null);
                    setStatus("idle");
                  }}
                  className="shrink-0 rounded-button border px-3 py-2 text-sm font-medium capitalize transition-colors"
                  style={
                    selected
                      ? { backgroundColor: palette.accent, borderColor: palette.accent, color: "#FFFFFF" }
                      : { borderColor: "var(--module-accent)", color: palette.ink }
                  }
                >
                  {shortDayLabel(group.iso, locale)}
                </button>
              );
            })}
          </div>

          {activeGroup && (
            <div className="flex flex-wrap gap-2">
              {activeGroup.slots.map((slot) => {
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
                    {timeLabel(slot.startsAt, locale)}
                  </button>
                );
              })}
            </div>
          )}

          {selectedStartsAt && (
            <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-1.5 border-t border-border-subtle pt-4">
              <label htmlFor="rdv-name" className={labelClass}>
                {t(locale, "rdv.name")}
              </label>
              <input
                id="rdv-name"
                className={inputClass}
                placeholder={t(locale, "rdv.namePlaceholder")}
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                required
              />
              <label htmlFor="rdv-email" className={labelClass}>
                {t(locale, "rdv.email")}
              </label>
              <input
                id="rdv-email"
                type="email"
                className={inputClass}
                placeholder={t(locale, "rdv.emailPlaceholder")}
                value={form.customerEmail}
                onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                required
              />
              <label htmlFor="rdv-phone" className={labelClass}>
                {t(locale, "rdv.phone")}
              </label>
              <input
                id="rdv-phone"
                className={inputClass}
                placeholder={t(locale, "rdv.phonePlaceholder")}
                value={form.customerPhone}
                onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                required
              />
              <label htmlFor="rdv-note" className={labelClass}>
                {t(locale, "rdv.note")}
              </label>
              <textarea
                id="rdv-note"
                className={inputClass}
                placeholder={t(locale, "rdv.notePlaceholder")}
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
                {t(locale, "rdv.confirm")}
              </button>
              {status === "error" && <p className="mt-1 text-red-500">{errorMessage}</p>}
            </form>
          )}

          {status === "sent" && (
            <p className="mt-1" style={{ color: palette.accent }}>
              {t(locale, "rdv.confirmed")}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
