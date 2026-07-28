type StatTileProps = {
  label: string;
  value: string | number;
  tone?: "navy" | "green" | "blue" | "amber";
};

const TONE_STYLES: Record<NonNullable<StatTileProps["tone"]>, string> = {
  navy: "text-navy",
  green: "text-green-accent",
  blue: "text-brand-mid",
  amber: "text-amber-600",
};

// Contrat "stat tile" — voir skill dataviz : label en phrase, valeur en chiffres proportionnels.
export default function StatTile({ label, value, tone = "navy" }: StatTileProps) {
  return (
    <div className="rounded-card bg-white p-6 shadow-card">
      <div className="text-sm font-medium text-gray-text">{label}</div>
      <div className={`mt-1 text-3xl font-bold ${TONE_STYLES[tone]}`}>{value}</div>
    </div>
  );
}
