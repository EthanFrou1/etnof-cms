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

// Longueur (texte brut, balises retirées) à partir de laquelle le texte dépasse ~10 lignes affichées
// (voir line-clamp-[10] plus bas — au-delà des paliers standards de Tailwind, qui s'arrêtent à 6,
// d'où la valeur arbitraire) et justifie le bouton "Voir plus" — seuil approximatif, pas de mesure
// DOM réelle nécessaire pour ce besoin.
const LONG_STORY_THRESHOLD = 800;

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// Section "Notre histoire" — texte de confiance sur l'établissement (SiteContent.StoryContent,
// distinct de la courte description du hero), accompagnée si possible de la 1ère photo
// d'établissement (Établissement > Photos, endpoint déjà public — jusqu'ici utilisé seulement dans
// l'aperçu admin). Ne s'affiche pas tant que le texte est vide (voir ContentTab, SiteSection.tsx).
export default function StorySection({ clientSiteId, apiBaseUrl, storyContent, palette, locale }: StorySectionProps) {
  const [image, setImage] = useState<EstablishmentImage | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/t/${clientSiteId}/establishment/images`)
      .then((res) => (res.ok ? res.json() : []))
      .then((images: EstablishmentImage[]) => setImage(images[0] ?? null))
      .catch(() => setImage(null));
  }, [apiBaseUrl, clientSiteId]);

  if (!storyContent.trim()) return null;

  const isLong = stripHtml(storyContent).length > LONG_STORY_THRESHOLD;

  return (
    <section id="histoire" className={`grid gap-8 ${image ? "sm:grid-cols-2 sm:items-center" : ""}`}>
      {image && (
        <div className="aspect-[4/5] overflow-hidden rounded-card border" style={{ borderColor: `${palette.ink}14` }}>
          <img src={`${apiBaseUrl}${image.path}`} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="flex flex-col gap-4">
        <span className="text-xl font-semibold uppercase tracking-[0.1em]" style={{ color: palette.accent }}>
          {t(locale, "nav.story")}
        </span>
        <div
          className={`text-lg leading-relaxed [&_a]:underline [&_strong]:font-semibold sm:text-xl ${
            expanded ? "" : "line-clamp-[10]"
          }`}
          style={{ color: `${palette.ink}99` }}
          dangerouslySetInnerHTML={{ __html: storyContent }}
        />
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="self-start text-sm font-semibold hover:underline"
            style={{ color: palette.accent }}
          >
            {expanded ? t(locale, "story.showLess") : t(locale, "story.showMore")}
          </button>
        )}
      </div>
    </section>
  );
}
