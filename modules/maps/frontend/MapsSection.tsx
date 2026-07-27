// Voir docs/10-templates.md : un module reste isolé, redéclare localement la forme de la palette
// du template actif plutôt que d'importer PaletteDef.
type ModulePalette = { accent: string; background: string; ink: string };

type MapsSectionProps = {
  address: string;
  apiKey: string;
  palette: ModulePalette;
};

export default function MapsSection({ address, apiKey, palette }: MapsSectionProps) {
  if (!apiKey) {
    return (
      <section className="rounded-card bg-white p-8 shadow-card">
        <span className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: palette.accent }}>
          Où nous trouver
        </span>
        <p className="mt-2 leading-relaxed text-gray-text">
          Module actif mais aucune clé Google Maps API renseignée pour ce site. Ajoute-la dans la
          configuration du module Maps (champ{" "}
          <code className="rounded px-1.5 py-0.5" style={{ backgroundColor: palette.background, color: palette.ink }}>
            apiKey
          </code>
          ) pour afficher la carte.
        </p>
      </section>
    );
  }

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
