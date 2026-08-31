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

  // Titre d'onglet + meta description propres à l'article — logique dupliquée depuis
  // frontend/src/hooks/useDocumentMeta.ts plutôt qu'importée à travers la frontière module/frontend
  // (un module reste isolé, voir docs/02-architecture-modules.md, même principe que readStoredLocale
  // ci-dessus).
  useEffect(() => {
    if (!post) return;
    document.title = post.title;
    // Balises HTML retirées avant troncature — post.content peut désormais contenir du HTML
    // (éditeur riche TipTap), une meta description ne doit jamais inclure de balises brutes.
    const description = post.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
    for (const [attr, key] of [["property", "og:title"], ["name", "description"], ["property", "og:description"]] as const) {
      let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", key === "og:title" ? post.title : description);
    }
  }, [post]);

  // Données structurées JSON-LD (BlogPosting) — même principe dupliqué que le bloc ci-dessus (un
  // module reste isolé, pas d'import de frontend/src/utils/structuredData.ts, voir
  // docs/02-architecture-modules.md). SEO avancé, voir docs/04-catalogue-modules.md.
  useEffect(() => {
    if (!post) return;
    const description = post.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
    let tag = document.head.querySelector<HTMLScriptElement>('script[type="application/ld+json"]');
    if (!tag) {
      tag = document.createElement("script");
      tag.setAttribute("type", "application/ld+json");
      document.head.appendChild(tag);
    }
    tag.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      ...(description ? { description } : {}),
      datePublished: post.publishedAt,
      mainEntityOfPage: { "@type": "WebPage", "@id": window.location.href.split("?")[0] },
    });
    return () => tag?.remove();
  }, [post]);

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
            {/* Articles écrits avant l'éditeur riche (TipTap) restent du texte brut sans balise —
                repli sur l'ancien rendu whitespace-pre-wrap pour ne pas perdre leurs retours à la
                ligne ; le HTML produit par l'éditeur est rendu tel quel sinon. */}
            {/<[a-z][\s\S]*>/i.test(post.content) ? (
              <div
                className="leading-relaxed text-gray-text [&_a]:text-brand-mid [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border-subtle [&_blockquote]:pl-3 [&_blockquote]:italic [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-navy [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-navy [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            ) : (
              <div className="whitespace-pre-wrap leading-relaxed text-gray-text">{post.content}</div>
            )}
          </article>
        )}
      </div>
    </div>
  );
}
