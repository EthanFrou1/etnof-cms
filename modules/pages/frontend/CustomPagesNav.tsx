import { useEffect, useRef, useState } from "react";

type CustomPageLink = { id: string; title: string; slug: string };

type CustomPagesNavProps = {
  apiBaseUrl: string;
  clientSiteId: string;
  label: string;
  ink: string;
  // "mobile" s'affiche à plat dans le panneau déroulant déjà ouvert (voir TemplateHestia/Helios) —
  // pas de popover flottant, ça n'aurait pas de sens dans un panneau qui occupe déjà tout l'écran.
  variant?: "desktop" | "mobile";
};

// Menu déroulant listant les pages personnalisées publiées, sous un intitulé choisi par le client
// (champ `pages.menuLabel`, même mécanisme générique que maps.apiKey — voir ModulesSection.tsx).
// Rien ne s'affiche si aucune page n'est publiée ou si le client n'a pas encore renseigné d'intitulé.
export default function CustomPagesNav({ apiBaseUrl, clientSiteId, label, ink, variant = "desktop" }: CustomPagesNavProps) {
  const [pages, setPages] = useState<CustomPageLink[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/t/${clientSiteId}/pages`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setPages)
      .catch(() => setPages([]));
  }, [apiBaseUrl, clientSiteId]);

  useEffect(() => {
    if (variant !== "desktop" || !open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [variant, open]);

  if (pages.length === 0 || !label.trim()) return null;

  if (variant === "mobile") {
    return (
      <div className="flex flex-col gap-1">
        <span className="px-2 pt-1 text-xs font-semibold uppercase tracking-wide opacity-60">{label}</span>
        {pages.map((p) => (
          <a
            key={p.id}
            href={`/t/${clientSiteId}/pages/${p.slug}`}
            style={{ color: "inherit" }}
            className="rounded-button px-2 py-2 hover:opacity-70"
          >
            {p.title}
          </a>
        ))}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ color: "inherit" }}
        className="flex items-center gap-1 hover:opacity-70"
      >
        {label}
        <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute left-0 top-[calc(100%+10px)] z-20 flex min-w-[190px] flex-col gap-0.5 rounded-card p-2 text-sm shadow-soft"
          style={{ backgroundColor: "#FFFFFF", color: ink }}
        >
          {pages.map((p) => (
            <a key={p.id} href={`/t/${clientSiteId}/pages/${p.slug}`} className="rounded-button px-3 py-2 hover:bg-black/5">
              {p.title}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
