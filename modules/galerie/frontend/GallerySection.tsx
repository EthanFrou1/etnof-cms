import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
// Écart assumé à "un module reste isolé" (docs/02-architecture-modules.md) : import direct du
// dictionnaire i18n du module Multilingue — voir modules/newsletter/frontend/NewsletterSection.tsx
// pour le même précédent.
import { t, type Locale } from "@modules/multilingue/frontend/translations";

// Couleurs du template actif — voir docs/10-templates.md : un module reste isolé, redéclare
// localement cette forme plutôt que d'importer PaletteDef.
type ModulePalette = { accent: string; background: string; ink: string };

type GalleryImage = {
  id: string;
  path: string;
};

type GallerySectionProps = {
  apiBaseUrl: string;
  clientSiteId: string;
  palette: ModulePalette;
  locale?: Locale;
};

export default function GallerySection({ apiBaseUrl, clientSiteId, palette, locale }: GallerySectionProps) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/t/${clientSiteId}/galerie/images`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setImages)
      .catch(() => setImages([]));
  }, [apiBaseUrl, clientSiteId]);

  // Boucle aux extrémités (dernière -> première et inversement), comportement standard d'un slider.
  const showPrevious = () => setSelectedIndex((i) => (i === null ? i : (i - 1 + images.length) % images.length));
  const showNext = () => setSelectedIndex((i) => (i === null ? i : (i + 1) % images.length));

  useEffect(() => {
    if (selectedIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedIndex(null);
      else if (e.key === "ArrowLeft") showPrevious();
      else if (e.key === "ArrowRight") showNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex, images.length]);

  if (images.length === 0) return null;

  const selected = selectedIndex === null ? null : images[selectedIndex];

  return (
    <section className="rounded-card bg-white p-8 shadow-card">
      <span className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: palette.accent }}>
        {t(locale, "gallery.label")}
      </span>
      <h2 className="mb-5 mt-1 text-2xl font-extrabold" style={{ color: palette.ink }}>
        {t(locale, "gallery.title")}
      </h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setSelectedIndex(index)}
            className="aspect-square overflow-hidden rounded-button transition-opacity hover:opacity-90"
          >
            <img src={`${apiBaseUrl}${image.path}`} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>

      {selected &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setSelectedIndex(null)}
          >
            <img
              src={`${apiBaseUrl}${selected.path}`}
              alt=""
              className="max-h-full max-w-full rounded-button object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    showPrevious();
                  }}
                  aria-label={t(locale, "gallery.previous")}
                  className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl leading-none text-white hover:bg-white/20 sm:left-4"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    showNext();
                  }}
                  aria-label={t(locale, "gallery.next")}
                  className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl leading-none text-white hover:bg-white/20 sm:right-4"
                >
                  ›
                </button>
                <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-pill bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                  {selectedIndex! + 1} / {images.length}
                </span>
              </>
            )}

            <button
              type="button"
              onClick={() => setSelectedIndex(null)}
              aria-label={t(locale, "gallery.close")}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl leading-none text-white hover:bg-white/20"
            >
              ×
            </button>
          </div>,
          document.body
        )}
    </section>
  );
}
