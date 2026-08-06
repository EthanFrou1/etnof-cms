import { useEffect, useState } from "react";

type CustomPage = {
  id: string;
  title: string;
  slug: string;
  content: string;
};

type CustomPageViewProps = {
  slug: string;
  apiBaseUrl: string;
  clientSiteId: string;
};

// Page publique d'une page personnalisée — même structure que modules/blog/frontend/BlogPostPage.tsx
// (montée seule via une route dédiée dans App.tsx, pas nichée dans PublicSite/un template). Pas de
// support multilingue pour l'instant (voir PagesModule.cs).
export default function CustomPageView({ slug, apiBaseUrl, clientSiteId }: CustomPageViewProps) {
  const [page, setPage] = useState<CustomPage | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/t/${clientSiteId}/pages/${slug}`)
      .then((res) => {
        if (res.status === 404) {
          setNotFound(true);
          return null;
        }
        return res.json();
      })
      .then((data: CustomPage | null) => data && setPage(data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, apiBaseUrl, clientSiteId]);

  // Titre d'onglet + meta description — même logique dupliquée que BlogPostPage.tsx (un module reste
  // isolé, voir docs/02-architecture-modules.md).
  useEffect(() => {
    if (!page) return;
    document.title = page.title;
    const description = page.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
    for (const [attr, key] of [["property", "og:title"], ["name", "description"], ["property", "og:description"]] as const) {
      let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", key === "og:title" ? page.title : description);
    }
  }, [page]);

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-gray-text">Cette page n'est pas (ou plus) disponible.</p>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-gray-text">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <a href={`/t/${clientSiteId}`} className="self-start text-sm font-medium text-gray-text hover:text-navy">
          ← Retour au site
        </a>

        <article className="rounded-card bg-white p-10 shadow-card">
          <h1 className="mb-6 text-4xl font-black leading-tight text-navy">{page.title}</h1>
          <div
            className="leading-relaxed text-gray-text [&_a]:text-brand-mid [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border-subtle [&_blockquote]:pl-3 [&_blockquote]:italic [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-navy [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-navy [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        </article>
      </div>
    </div>
  );
}
