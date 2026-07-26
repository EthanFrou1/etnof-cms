type MapsSectionProps = {
  address: string;
  apiKey: string;
};

export default function MapsSection({ address, apiKey }: MapsSectionProps) {
  if (!apiKey) {
    return (
      <section className="rounded-card bg-white p-8 shadow-card">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-green-accent">
          Maps
        </span>
        <p className="mt-2 leading-relaxed text-gray-text">
          Module actif mais aucune clé Google Maps API renseignée pour ce site. Ajoute-la dans la
          configuration du module Maps (champ <code className="rounded bg-bg-page-start px-1.5 py-0.5 text-navy">apiKey</code>) pour afficher la carte.
        </p>
      </section>
    );
  }

  const src = `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(address)}`;

  return (
    <section className="overflow-hidden rounded-card shadow-card">
      <iframe title="Carte" src={src} className="h-72 w-full border-0" loading="lazy" />
    </section>
  );
}
