import { useEffect, useState } from "react";

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
};

export default function BlogSection({ apiBaseUrl, clientSiteId, palette }: BlogSectionProps) {
  const [posts, setPosts] = useState<BlogPostSummary[]>([]);

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/t/${clientSiteId}/blog`)
      .then((res) => res.json())
      .then(setPosts)
      .catch((err) => console.error("Erreur BlogSection :", err));
  }, [apiBaseUrl, clientSiteId]);

  if (posts.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <span className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: palette.accent }}>
        Blog
      </span>
      <div className="flex flex-col gap-3">
        {posts.map((post) => (
          <a
            key={post.id}
            href={`/t/${clientSiteId}/blog/${post.slug}`}
            className="rounded-card bg-white p-6 shadow-card transition-shadow hover:shadow-soft"
          >
            <span className="text-xs text-gray-text" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {new Date(post.publishedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
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
