type StatTileProps = {
  label: string;
  value: string | number;
};

// Contrat "stat tile" — voir skill dataviz : label en phrase, valeur en chiffres proportionnels.
export default function StatTile({ label, value }: StatTileProps) {
  return (
    <div className="rounded-card bg-white p-6 shadow-card">
      <div className="text-sm font-medium text-gray-text">{label}</div>
      <div className="mt-1 text-3xl font-bold text-navy">{value}</div>
    </div>
  );
}
