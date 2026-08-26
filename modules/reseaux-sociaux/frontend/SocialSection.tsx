// Écart assumé à "un module reste isolé" (docs/02-architecture-modules.md) : import direct du
// dictionnaire i18n du module Multilingue — même précédent que NewsletterSection.tsx.
import { t, type Locale } from "@modules/multilingue/frontend/translations";
import SocialLinks from "./SocialLinks";

// Couleurs du template actif — voir docs/10-templates.md : un module reste isolé, redéclare
// localement cette forme plutôt que d'importer PaletteDef.
type ModulePalette = { accent: string; background: string; ink: string };

type SocialSectionProps = {
  facebookUrl?: string;
  instagramUrl?: string;
  palette: ModulePalette;
  locale?: Locale;
};

// Section dédiée sur la page d'accueil — jusqu'ici les icônes n'apparaissaient que dans le footer
// (SiteFooter.tsx), sans mise en avant propre comme les autres modules (Contact, Newsletter…).
// Retombe sur `null` si aucune URL n'est renseignée, même logique que SocialLinks.tsx.
export default function SocialSection({ facebookUrl, instagramUrl, palette, locale }: SocialSectionProps) {
  if (!facebookUrl?.trim() && !instagramUrl?.trim()) return null;

  return (
    <section className="rounded-card bg-white p-8 shadow-card">
      <span className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: palette.accent }}>
        {t(locale, "nav.reseauxSociaux")}
      </span>
      <h2 className="mb-1 mt-1 text-2xl font-extrabold" style={{ color: palette.ink }}>
        {t(locale, "social.title")}
      </h2>
      <p className="mb-5 text-sm text-gray-text">{t(locale, "social.description")}</p>
      <SocialLinks facebookUrl={facebookUrl} instagramUrl={instagramUrl} />
    </section>
  );
}
