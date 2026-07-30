import { useEffect, useState } from "react";
// Écart assumé à "un module reste isolé" (docs/02-architecture-modules.md) : import direct du
// dictionnaire i18n du module Multilingue — voir modules/multilingue/frontend/translations.ts.
import { t, type Locale } from "@modules/multilingue/frontend/translations";

// Duplique la petite logique de lecture de useLocale.ts (frontend/src/hooks) plutôt que d'importer
// à travers la frontière module/frontend — un module reste isolé, voir docs/02-architecture-modules.md
// (même principe que ModulePalette redéclaré dans BlogSection.tsx). Cette page est montée seule
// (route dédiée dans App.tsx, pas nichée dans PublicSite/un template), donc pas de state partagé
// possible avec le sélecteur de langue affiché sur la page d'accueil : on relit juste le choix déjà
// persisté par l'utilisateur pour ce tenant.
function readStoredLocale(clientSiteId: string): Locale {
  const stored = localStorage.getItem(`etnof-locale-${clientSiteId}`);
  return stored === "en" || stored === "es" ? stored : "fr";
}

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  content: string;
  publishedAt: string;
};

type BlogPostPageProps = {
  slug: string;
  apiBaseUrl: string;
  clientSiteId: string;
};

export default function BlogPostPage({ slug, apiBaseUrl, clientSiteId }: BlogPostPageProps) {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [notFound, setNotFound] = useState(false);
  const locale = readStoredLocale(clientSiteId);

  useEffect(() => {
    const query = locale !== "fr" ? `?locale=${locale}` : "";
    fetch(`${apiBaseUrl}/api/t/${clientSiteId}/blog/${slug}${query}`)
      .then((res) => {
        if (res.status === 404) {
          setNotFound(true);
          return null;
        }
        return res.json();
      })
      .then((data: BlogPost | null) => data && setPost(data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, apiBaseUrl, clientSiteId]);

  return (
    <div className="min-h-screen px-4 py-6 sm:px-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <a
          href={`/t/${clientSiteId}`}
          className="self-start text-sm font-medium text-gray-text hover:text-navy"
        >
          {t(locale, "blog.backToSite")}
        </a>

        {notFound && (
          <p className="rounded-card bg-white p-8 text-red-500 shadow-card">{t(locale, "blog.notFound")}</p>
        )}

        {post && (
          <article className="rounded-card bg-white p-10 shadow-card">
            <h1 className="mb-6 text-4xl font-black leading-tight text-navy">{post.title}</h1>
            <div className="whitespace-pre-wrap leading-relaxed text-gray-text">{post.content}</div>
          </article>
        )}
      </div>
    </div>
  );
}
