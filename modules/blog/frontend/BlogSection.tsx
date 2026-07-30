import { useEffect, useState } from "react";
// Écart assumé à "un module reste isolé" (docs/02-architecture-modules.md) : import direct du
// dictionnaire i18n du module Multilingue plutôt que de dupliquer des chaînes ici — voir
// modules/multilingue/frontend/translations.ts.
import { t, localeTag, type Locale } from "@modules/multilingue/frontend/translations";

type BlogPostSummary = {
  id: string;
  title: string;
  slug: string;
  publishedAt: string;
};

// Voir docs/10-templates.md : un module reste isolé, redéclare localement la forme de la palette
// du template actif plutôt que d'importer PaletteDef.
type ModulePalette = { accent: string; background: string; ink: string };

type BlogSectionProps = {
  apiBaseUrl: string;
  clientSiteId: string;
  palette: ModulePalette;
  // Optionnel : "fr" ou omis n'ajoute pas de paramètre (voir useContent.ts, même convention) —
  // le backend ignore de toute façon `locale` si le module Multilingue n'est pas actif.
  locale?: Locale;
};

export default function BlogSection({ apiBaseUrl, clientSiteId, palette, locale }: BlogSectionProps) {
  const [posts, setPosts] = useState<BlogPostSummary[]>([]);

  useEffect(() => {
    const query = locale && locale !== "fr" ? `?locale=${locale}` : "";
    fetch(`${apiBaseUrl}/api/t/${clientSiteId}/blog${query}`)
      .then((res) => res.json())
      .then(setPosts)
      .catch((err) => console.error("Erreur BlogSection :", err));
  }, [apiBaseUrl, clientSiteId, locale]);

  if (posts.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <span className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: palette.accent }}>
        {t(locale, "nav.blog")}
      </span>
      <div className="flex flex-col gap-3">
        {posts.map((post) => (
          <a
            key={post.id}
            href={`/t/${clientSiteId}/blog/${post.slug}`}
            className="rounded-card bg-white p-6 shadow-card transition-shadow hover:shadow-soft"
          >
            <span className="text-xs text-gray-text" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {new Date(post.publishedAt).toLocaleDateString(localeTag(locale), { day: "numeric", month: "long", year: "numeric" })}
            </span>
            <span className="mt-1 block text-lg font-bold" style={{ color: palette.ink }}>
              {post.title}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
