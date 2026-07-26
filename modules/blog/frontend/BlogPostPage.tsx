import { useEffect, useState } from "react";

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

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/t/${clientSiteId}/blog/${slug}`)
      .then((res) => {
        if (res.status === 404) {
          setNotFound(true);
          return null;
        }
        return res.json();
      })
      .then((data: BlogPost | null) => data && setPost(data));
  }, [slug, apiBaseUrl, clientSiteId]);

  return (
    <div className="min-h-screen px-4 py-6 sm:px-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <a
          href={`/t/${clientSiteId}`}
          className="self-start text-sm font-medium text-gray-text hover:text-navy"
        >
          ← Retour au site
        </a>

        {notFound && (
          <p className="rounded-card bg-white p-8 text-red-500 shadow-card">Article introuvable.</p>
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
