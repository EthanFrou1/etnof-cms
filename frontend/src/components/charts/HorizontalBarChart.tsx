type BarDatum = {
  label: string;
  value: number;
};

type HorizontalBarChartProps = {
  title: string;
  data: BarDatum[];
  emptyLabel?: string;
};

// Comparaison de magnitude entre catégories → une seule teinte séquentielle (bleu), pas de
// palette catégorielle : ce n'est pas plusieurs séries, juste un décompte par catégorie.
// Voir skill dataviz (references/palette.md, sequential hue #2a78d6 / references/marks-and-anatomy.md).
const BAR_COLOR = "#2a78d6";

export default function HorizontalBarChart({ title, data, emptyLabel }: HorizontalBarChartProps) {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const max = Math.max(1, ...sorted.map((d) => d.value));

  return (
    <div className="rounded-card bg-white p-6 shadow-card">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.05em] text-gray-text">
        {title}
      </h3>

      {sorted.length === 0 ? (
        <p className="text-sm text-gray-text">{emptyLabel ?? "Pas encore de données."}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((d) => (
            <div key={d.label} className="flex items-center gap-3">
              <span
                className="w-28 shrink-0 truncate text-sm text-gray-text"
                title={d.label}
              >
                {d.label}
              </span>
              <div className="h-5 flex-1 overflow-hidden rounded bg-border-subtle/40">
                <div
                  className="h-5 rounded-r"
                  style={{ width: `${(d.value / max) * 100}%`, backgroundColor: BAR_COLOR }}
                  title={`${d.label} : ${d.value}`}
                />
              </div>
              <span className="w-6 shrink-0 text-right text-sm font-semibold text-navy">
                {d.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
