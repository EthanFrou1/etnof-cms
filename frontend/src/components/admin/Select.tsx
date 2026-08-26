import { useEffect, useRef, useState } from "react";
import { IconCheck, IconChevronDown } from "./icons";

export type SelectOption = { value: string; label: string; group?: string };

type SelectProps = {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
};

// Remplace un <select> natif : le déclencheur peut se styliser normalement, mais le menu déroulant
// d'un <select> natif reste imposé par le navigateur (voir SitesSection.tsx, demandé par Ethan
// après avoir vu le menu "Statut" en gris système au lieu des couleurs du site).
export default function Select({ value, options, onChange, className = "" }: SelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between gap-2 text-left ${className}`}
      >
        <span className="truncate whitespace-nowrap">{selected?.label ?? ""}</span>
        <IconChevronDown className={`h-4 w-4 shrink-0 text-gray-text transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul className="absolute left-0 right-0 top-full z-20 mt-1 flex max-h-60 flex-col gap-0.5 overflow-y-auto rounded-button border border-border-subtle bg-white p-1.5 shadow-soft">
          {options.map((o, index) => (
            <li key={o.value || index}>
              {o.group && o.group !== options[index - 1]?.group && (
                <span className="mb-0.5 mt-1.5 block px-3 text-[10px] font-semibold uppercase tracking-wide text-gray-text/50 first:mt-0">
                  {o.group}
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-button px-3 py-2 text-left text-sm transition-colors ${
                  o.value === value ? "bg-brand-mid/10 font-semibold text-brand-mid" : "text-navy hover:bg-bg-page-start"
                }`}
              >
                {o.label}
                {o.value === value && <IconCheck className="h-3.5 w-3.5 shrink-0" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
