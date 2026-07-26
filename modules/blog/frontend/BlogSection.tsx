import { useEffect, useState } from "react";

type BlogPostSummary = {
  id: string;
  title: string;
  slug: string;
  publishedAt: string;
};

type BlogSectionProps = {
  apiBaseUrl: string;
  clientSiteId: string;
};

export default function BlogSection({ apiBaseUrl, clientSiteId }: BlogSectionProps) {
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
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-green-accent">
        Blog
      </span>
      <div className="flex flex-col gap-3">
        {posts.map((post) => (
          <a
            key={post.id}
            href={`/t/${clientSiteId}/blog/${post.slug}`}
            className="rounded-card bg-white p-6 shadow-card transition-shadow hover:shadow-soft"
          >
            <span className="text-lg font-bold text-navy">{post.title}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
