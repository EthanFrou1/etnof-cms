import { useState } from "react";

export type StatusLegendItem = {
  label: string;
  badgeClass: string;
  description: string;
};

// Bouton "?" + modale d'aide listant chaque statut affiché dans un tableau (badge + explication) —
// réutilisé par toutes les listes filtrables par statut (factures, devis, commandes...) plutôt
// qu'une légende inline qui ne tiendrait pas à côté du filtre sur mobile.
export function StatusLegend({ items }: { items: StatusLegendItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Comprendre les statuts"
        title="Comprendre les statuts"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border-subtle text-xs font-semibold text-gray-text hover:border-brand-mid hover:text-brand-mid"
      >
        ?
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4" onClick={() => setOpen(false)}>
          <div
            className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-card bg-white p-6 shadow-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy">Les statuts</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-xl leading-none text-gray-text hover:text-navy">
                ×
              </button>
            </div>
            <ul className="flex flex-col gap-3">
              {items.map((item) => (
                <li key={item.label} className="flex items-start gap-3">
                  <span className={`mt-0.5 shrink-0 rounded-pill px-2.5 py-1 text-xs font-semibold ${item.badgeClass}`}>
                    {item.label}
                  </span>
                  <span className="text-sm text-gray-text">{item.description}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
