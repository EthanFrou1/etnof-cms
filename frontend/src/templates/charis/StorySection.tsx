import { useEffect, useState } from "react";
import { t, type Locale } from "@modules/multilingue/frontend/translations";

type ModulePalette = { accent: string; background: string; ink: string };

type EstablishmentImage = { id: string; path: string };

type StorySectionProps = {
  clientSiteId: string;
  apiBaseUrl: string;
  storyContent: string;
  palette: ModulePalette;
  locale?: Locale;
};

// Section "Notre histoire" — texte de confiance sur l'établissement (SiteContent.StoryContent,
// distinct de la courte description du hero), accompagnée si possible de la 1ère photo
// d'établissement (Établissement > Photos, endpoint déjà public — jusqu'ici utilisé seulement dans
// l'aperçu admin). Ne s'affiche pas tant que le texte est vide (voir ContentTab, SiteSection.tsx).
export default function StorySection({ clientSiteId, apiBaseUrl, storyContent, palette, locale }: StorySectionProps) {
  const [image, setImage] = useState<EstablishmentImage | null>(null);

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/t/${clientSiteId}/establishment/images`)
      .then((res) => (res.ok ? res.json() : []))
      .then((images: EstablishmentImage[]) => setImage(images[0] ?? null))
      .catch(() => setImage(null));
  }, [apiBaseUrl, clientSiteId]);

  if (!storyContent.trim()) return null;

  return (
    <section id="histoire" className={`grid gap-8 ${image ? "sm:grid-cols-2 sm:items-center" : ""}`}>
      {image && (
        <div className="aspect-[4/5] overflow-hidden rounded-card border" style={{ borderColor: `${palette.ink}14` }}>
          <img src={`${apiBaseUrl}${image.path}`} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="flex flex-col gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: palette.accent }}>
          {t(locale, "nav.story")}
        </span>
        <div
          className="text-base leading-relaxed [&_a]:underline [&_strong]:font-semibold"
          style={{ color: `${palette.ink}99` }}
          dangerouslySetInnerHTML={{ __html: storyContent }}
        />
      </div>
    </section>
  );
}
