import { useState, type FormEvent } from "react";
// Écart assumé à "un module reste isolé" (docs/02-architecture-modules.md) : import direct du
// dictionnaire i18n du module Multilingue plutôt que de dupliquer des chaînes ici — voir
// modules/multilingue/frontend/translations.ts.
import { t, type Locale } from "@modules/multilingue/frontend/translations";

// Couleurs du template actif — voir docs/10-templates.md : un module reste isolé (ne dépend
// d'aucun import de frontend/src ou d'un autre module), donc redéclare localement cette forme
// plutôt que d'importer PaletteDef.
type ModulePalette = { accent: string; background: string; ink: string };

type NewsletterSectionProps = {
  apiBaseUrl: string;
  clientSiteId: string;
  palette: ModulePalette;
  locale?: Locale;
};

const inputClass =
  "rounded-button border border-border-subtle bg-white px-4 py-2.5 placeholder:text-gray-text/60 focus:outline-none focus:ring-2 focus:border-[var(--module-accent)] focus:ring-[var(--module-accent)]/20";

export default function NewsletterSection({ apiBaseUrl, clientSiteId, palette, locale }: NewsletterSectionProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("sending");

    try {
      const res = await fetch(`${apiBaseUrl}/api/t/${clientSiteId}/newsletter/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) throw new Error("Erreur d'inscription");

      setEmail("");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  return (
    <section
      className="rounded-card bg-white p-8 shadow-card"
      style={{ "--module-accent": palette.accent } as React.CSSProperties}
    >
      <span className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: palette.accent }}>
        {t(locale, "newsletter.label")}
      </span>
      <h2 className="mb-1 mt-1 text-2xl font-extrabold" style={{ color: palette.ink }}>
        {t(locale, "newsletter.title")}
      </h2>
      <p className="mb-5 text-sm text-gray-text">{t(locale, "newsletter.description")}</p>

      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
        <input
          type="email"
          className={`${inputClass} flex-1`}
          placeholder={t(locale, "newsletter.emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="shrink-0 rounded-button px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: palette.accent }}
        >
          {t(locale, "newsletter.submit")}
        </button>
      </form>
      {status === "sent" && (
        <p className="mt-2 text-sm" style={{ color: palette.accent }}>
          {t(locale, "newsletter.sent")}
        </p>
      )}
      {status === "error" && <p className="mt-2 text-sm text-red-500">{t(locale, "newsletter.error")}</p>}
    </section>
  );
}
