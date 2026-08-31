import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";
import { useAdminSession, adminFetch } from "../hooks/useAdminSession";
import { useModules } from "../hooks/useModules";
import AdminLoginScreen from "../components/admin/AdminLoginScreen";
import AdminLayout from "../components/admin/AdminLayout";
import ConfirmModal from "../components/admin/ConfirmModal";
import RichTextEditor from "../components/admin/RichTextEditor";
import SaveButton from "../components/admin/SaveButton";

type CustomPage = {
  id: string;
  title: string;
  slug: string;
  content: string;
  publishedAt: string | null;
};

type PageForm = {
  title: string;
  slug: string;
  content: string;
  published: boolean;
};

type PageDetailPageProps = {
  clientSiteId: string;
  pageId: string;
};

const inputClass =
  "rounded-button border border-border-subtle bg-white px-3 py-2 text-navy placeholder:text-gray-text/60 focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20";

function toForm(page: CustomPage): PageForm {
  return { title: page.title, slug: page.slug, content: page.content, published: page.publishedAt !== null };
}

// Même structure que BlogPostDetailPage.tsx (même éditeur riche, même logique de sauvegarde) —
// dupliquée plutôt que factorisée : deux entités différentes (CustomPage/BlogPost), voir CLAUDE.md
// règle 7 (rester simple, pas d'abstraction prématurée pour deux formulaires proches mais distincts).
function PageDetailContent({
  clientSiteId,
  pageId,
  password,
}: {
  clientSiteId: string;
  pageId: string;
  password: string;
}) {
  const [page, setPage] = useState<CustomPage | null>(null);
  const [form, setForm] = useState<PageForm | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/pages/${pageId}`, password)
      .then((res) => res.json())
      .then((data: CustomPage) => {
        setPage(data);
        setForm(toForm(data));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDirty = Boolean(
    page &&
      form &&
      (form.title !== page.title ||
        form.slug !== page.slug ||
        form.content !== page.content ||
        form.published !== (page.publishedAt !== null))
  );

  const handleSave = async () => {
    if (!form) return;
    setSaveStatus("saving");
    const res = await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/pages/${pageId}`, password, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      window.location.href = `/admin/${clientSiteId}/pages`;
      return;
    }
    setSaveStatus("error");
  };

  const handleDelete = async () => {
    await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/pages/${pageId}`, password, { method: "DELETE" });
    window.location.href = `/admin/${clientSiteId}/pages`;
  };

  if (!page || !form) return <p className="text-gray-text">Chargement…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <a href={`/admin/${clientSiteId}/pages`} className="text-sm text-brand-mid hover:underline">
            ← Retour aux pages
          </a>
          <h1 className="mt-1 text-2xl font-extrabold text-navy">{page.title || "(sans titre)"}</h1>
        </div>
        <SaveButton
          status={saveStatus}
          onClick={handleSave}
          onIdle={() => setSaveStatus("idle")}
          disabled={!isDirty}
        />
      </div>

      <section className="rounded-card bg-white p-8 shadow-card">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-gray-text">
            Titre
            <input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-text">
            Slug (URL publique : /pages/{form.slug || "…"})
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
            Publiée (visible dans le menu du site public)
          </label>
        </div>
      </section>

      <button
        type="button"
        onClick={() => setConfirmingDelete(true)}
        className="self-start text-sm text-red-500 hover:text-red-600"
      >
        Supprimer la page
      </button>

      {confirmingDelete && (
        <ConfirmModal
          title={`Supprimer "${page.title || "cette page"}" ?`}
          message="Cette action est définitive."
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}

export default function PageDetailPage({ clientSiteId, pageId }: PageDetailPageProps) {
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

  // Accès direct par URL alors que le module Pages n'est pas actif pour ce tenant — même garde que
  // pour /admin/{clientSiteId}/blog/{postId} (BlogPostDetailPage.tsx).
  const blocked = modules !== null && !modules?.pages?.enabled;

  return (
    <AdminLayout clientSiteId={clientSiteId} activeSection="pages" password={password}>
      {blocked ? (
        <div className="rounded-card bg-white p-8 shadow-card">
          <p className="text-gray-text">Le module Pages personnalisées n'est pas activé pour ce site — cette page n'est pas disponible.</p>
        </div>
      ) : (
        <PageDetailContent clientSiteId={clientSiteId} pageId={pageId} password={password} />
      )}
    </AdminLayout>
  );
}
