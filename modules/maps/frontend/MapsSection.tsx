// Voir docs/10-templates.md : un module reste isolé, redéclare localement la forme de la palette
// du template actif plutôt que d'importer PaletteDef.
type ModulePalette = { accent: string; background: string; ink: string };

type MapsSectionProps = {
  address: string;
  apiKey: string;
  palette: ModulePalette;
};

export default function MapsSection({ address, apiKey, palette }: MapsSectionProps) {
  // Module activé mais pas encore configuré (pas de clé Google Maps) : rien à afficher sur le site
  // public plutôt qu'un encart "configuration manquante" — ce message n'a de valeur que côté admin
  // (voir ModulesSection.tsx, la card Maps explique déjà qu'il manque la clé).
  if (!apiKey) return null;

  const src = `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(address)}`;

  return (
    <section className="flex flex-col gap-4">
      <span className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: palette.accent }}>
        Où nous trouver
      </span>
      <div className="overflow-hidden rounded-card shadow-card">
        <iframe title="Carte" src={src} className="h-72 w-full border-0" loading="lazy" />
      </div>
    </section>
  );
}
