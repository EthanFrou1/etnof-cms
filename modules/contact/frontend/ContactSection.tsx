import { useState, type CSSProperties, type FormEvent } from "react";

// Couleurs du template actif — voir docs/10-templates.md : un module reste isolé (ne dépend
// d'aucun import de frontend/src ou d'un autre module), donc redéclare localement cette forme
// plutôt que d'importer PaletteDef.
type ModulePalette = { accent: string; background: string; ink: string };

type ContactSectionProps = {
  apiBaseUrl: string;
  clientSiteId: string;
  palette: ModulePalette;
};

type FormState = {
  name: string;
  email: string;
  message: string;
};

const initialState: FormState = { name: "", email: "", message: "" };

const inputClass =
  "rounded-button border border-border-subtle bg-white px-4 py-2.5 placeholder:text-gray-text/60 focus:outline-none focus:ring-2 focus:border-[var(--module-accent)] focus:ring-[var(--module-accent)]/20";

const labelClass = "mt-2 text-xs font-semibold text-gray-text first:mt-0";

export default function ContactSection({ apiBaseUrl, clientSiteId, palette }: ContactSectionProps) {
  const [form, setForm] = useState<FormState>(initialState);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("sending");

    try {
      const res = await fetch(`${apiBaseUrl}/api/t/${clientSiteId}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Erreur d'envoi");

      setForm(initialState);
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  return (
    <section
      className="rounded-card bg-white p-8 shadow-card"
      style={{ "--module-accent": palette.accent } as CSSProperties}
    >
      <span className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: palette.accent }}>
        Contact
      </span>
      <h2 className="mb-5 mt-1 text-2xl font-extrabold" style={{ color: palette.ink }}>
        Une question ?
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
        <label htmlFor="contact-name" className={labelClass}>
          Nom
        </label>
        <input
          id="contact-name"
          className={inputClass}
          placeholder="Votre nom"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <label htmlFor="contact-email" className={labelClass}>
          Email
        </label>
        <input
          id="contact-email"
          type="email"
          className={inputClass}
          placeholder="vous@exemple.fr"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <label htmlFor="contact-message" className={labelClass}>
          Message
        </label>
        <textarea
          id="contact-message"
          className={inputClass}
          placeholder="Votre message"
          rows={4}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          required
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="mt-4 rounded-button px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: palette.accent }}
        >
          Envoyer
        </button>
        {status === "sent" && (
          <p className="mt-1" style={{ color: palette.accent }}>
            Message envoyé !
          </p>
        )}
        {status === "error" && <p className="mt-1 text-red-500">Erreur, réessaie.</p>}
      </form>
    </section>
  );
}
