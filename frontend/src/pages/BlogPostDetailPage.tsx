import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";
import { useAdminSession, adminFetch } from "../hooks/useAdminSession";
import { useModules } from "../hooks/useModules";
import AdminLoginScreen from "../components/admin/AdminLoginScreen";
import AdminLayout from "../components/admin/AdminLayout";
import ConfirmModal from "../components/admin/ConfirmModal";
import RichTextEditor from "../components/admin/RichTextEditor";

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  content: string;
  publishedAt: string | null;
};

type BlogPostForm = {
  title: string;
  slug: string;
  content: string;
  published: boolean;
};

type BlogPostDetailPageProps = {
  clientSiteId: string;
  postId: string;
};

const inputClass =
  "rounded-button border border-border-subtle bg-white px-3 py-2 text-navy placeholder:text-gray-text/60 focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20";

function toForm(post: BlogPost): BlogPostForm {
  return { title: post.title, slug: post.slug, content: post.content, published: post.publishedAt !== null };
}

function BlogPostDetailContent({
  clientSiteId,
  postId,
  password,
}: {
  clientSiteId: string;
  postId: string;
  password: string;
}) {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [form, setForm] = useState<BlogPostForm | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/blog/posts/${postId}`, password)
      .then((res) => res.json())
      .then((data: BlogPost) => {
        setPost(data);
        setForm(toForm(data));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDirty = Boolean(
    post &&
      form &&
      (form.title !== post.title ||
        form.slug !== post.slug ||
        form.content !== post.content ||
        form.published !== (post.publishedAt !== null))
  );

  const handleSave = async () => {
    if (!form) return;
    setSaveStatus("saving");
    const res = await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/blog/posts/${postId}`, password, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const updated = (await res.json()) as BlogPost;
      setPost(updated);
      setForm(toForm(updated));
    }
    setSaveStatus(res.ok ? "saved" : "error");
  };

  const handleDelete = async () => {
    await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/blog/posts/${postId}`, password, { method: "DELETE" });
    window.location.href = `/admin/${clientSiteId}/blog`;
  };

  if (!post || !form) return <p className="text-gray-text">Chargement…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <a href={`/admin/${clientSiteId}/blog`} className="text-sm text-brand-mid hover:underline">
            ← Retour au blog
          </a>
          <h1 className="mt-1 text-2xl font-extrabold text-navy">{post.title || "(sans titre)"}</h1>
        </div>
        <div className="flex items-center gap-3">
          {saveStatus === "saved" && <span className="text-sm text-green-accent">Enregistré</span>}
          {saveStatus === "error" && <span className="text-sm text-red-500">Erreur lors de l'enregistrement.</span>}
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || saveStatus === "saving"}
            className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saveStatus === "saving" ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>

      <section className="rounded-card bg-white p-8 shadow-card">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-gray-text">
            Titre
            <input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-text">
            Slug (URL publique : /blog/{form.slug || "…"})
            <input className={`${inputClass} font-mono`} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-text">
            Contenu
            <RichTextEditor value={form.content} onChange={(content) => setForm({ ...form, content })} />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-text">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand-mid"
              checked={form.published}
              onChange={(e) => setForm({ ...form, published: e.target.checked })}
            />
            Publié (visible sur le site public)
          </label>
        </div>
      </section>

      <button
        type="button"
        onClick={() => setConfirmingDelete(true)}
        className="self-start text-sm text-red-500 hover:text-red-600"
      >
        Supprimer l'article
      </button>

      {confirmingDelete && (
        <ConfirmModal
          title={`Supprimer "${post.title || "cet article"}" ?`}
          message="Cette action est définitive."
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}

export default function BlogPostDetailPage({ clientSiteId, postId }: BlogPostDetailPageProps) {
  const { password, login } = useAdminSession(clientSiteId);
  const modules = useModules(clientSiteId);

  if (!password) {
    return (
      <AdminLoginScreen
        title="Connecte-toi pour gérer ton site"
        loginPath={`/api/t/${clientSiteId}/admin/login`}
        onLoggedIn={login}
      />
    );
  }

  // Accès direct par URL alors que le module Blog n'est pas actif pour ce tenant — même garde que
  // pour /admin/{clientSiteId}/products/{productId} (ProductDetailPage.tsx).
  const blocked = modules !== null && !modules?.blog?.enabled;

  return (
    <AdminLayout clientSiteId={clientSiteId} activeSection="blog" password={password}>
      {blocked ? (
        <div className="rounded-card bg-white p-8 shadow-card">
          <p className="text-gray-text">Le module Blog n'est pas activé pour ce site — cette page n'est pas disponible.</p>
        </div>
      ) : (
        <BlogPostDetailContent clientSiteId={clientSiteId} postId={postId} password={password} />
      )}
    </AdminLayout>
  );
}
