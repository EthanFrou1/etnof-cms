import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../config";
import { adminFetch } from "../../hooks/useAdminSession";
import ConfirmModal from "../../components/admin/ConfirmModal";
import Select from "../../components/admin/Select";

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  publishedAt: string | null;
  createdAt: string;
};

type BlogSectionProps = {
  clientSiteId: string;
  password: string;
};

type StatusFilter = "all" | "published" | "draft";
type SortField = "createdAt" | "title";
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 10;

const inputClass =
  "rounded-button border border-border-subtle bg-white px-3 py-2 text-sm text-navy placeholder:text-gray-text/60 focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Tous les statuts" },
  { value: "published", label: "Publié" },
  { value: "draft", label: "Brouillon" },
];

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) return <span className="text-gray-text/30">↕</span>;
  return <span className="text-navy">{direction === "asc" ? "↑" : "↓"}</span>;
}

export default function BlogSection({ clientSiteId, password }: BlogSectionProps) {
  const [posts, setPosts] = useState<BlogPost[] | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null);

  const loadPosts = () =>
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/blog/posts`, password)
      .then((res) => res.json())
      .then(setPosts);

  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    const res = await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/blog/posts`, password, { method: "POST" });
    const post = (await res.json()) as BlogPost;
    window.location.href = `/admin/${clientSiteId}/blog/${post.id}`;
  };

  const handleDelete = async (id: string) => {
    setPostToDelete(null);
    await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/blog/posts/${id}`, password, { method: "DELETE" });
    await loadPosts();
  };

  const toggleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "createdAt" ? "desc" : "asc");
    }
    setPage(1);
  };

  const filteredSorted = useMemo(() => {
    if (!posts) return [];

    const query = search.trim().toLowerCase();
    const filtered = posts.filter((p) => {
      if (statusFilter === "published" && !p.publishedAt) return false;
      if (statusFilter === "draft" && p.publishedAt) return false;
      if (!query) return true;
      return p.title.toLowerCase().includes(query);
    });

    const sorted = [...filtered].sort((a, b) => {
      const cmp =
        sortField === "createdAt"
          ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          : a.title.localeCompare(b.title);
      return sortDirection === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [posts, search, statusFilter, sortField, sortDirection]);

  const pageCount = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = filteredSorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const columnHeaderClass = "cursor-pointer select-none px-4 py-3 text-left hover:text-navy";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">Blog</h1>
          <p className="mt-1 text-sm text-gray-text">Articles affichés sur le site public une fois publiés.</p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {creating ? "Création…" : "+ Nouvel article"}
        </button>
      </div>

      {!posts ? (
        <p className="text-gray-text">Chargement…</p>
      ) : posts.length === 0 ? (
        <section className="rounded-card bg-white p-8 shadow-card">
          <p className="text-gray-text">Aucun article pour l'instant — clique sur "Nouvel article" pour commencer.</p>
        </section>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <input
              className={`${inputClass} w-64`}
              placeholder="Rechercher un titre"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <div className="w-44 shrink-0">
              <Select
                className={inputClass}
                value={statusFilter}
                onChange={(v) => {
                  setStatusFilter(v as StatusFilter);
                  setPage(1);
                }}
                options={STATUS_FILTERS.map((f) => ({ value: f.value, label: f.label }))}
              />
            </div>
            <span className="text-sm text-gray-text">
              {filteredSorted.length} article{filteredSorted.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="overflow-x-auto rounded-card bg-white shadow-card">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-xs font-semibold uppercase tracking-[0.05em] text-gray-text">
                  <th className={columnHeaderClass} onClick={() => toggleSort("title")}>
                    <span className="flex items-center gap-1">
                      Titre <SortIcon active={sortField === "title"} direction={sortDirection} />
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className={columnHeaderClass} onClick={() => toggleSort("createdAt")}>
                    <span className="flex items-center gap-1">
                      Créé le <SortIcon active={sortField === "createdAt"} direction={sortDirection} />
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((post) => (
                  <tr
                    key={post.id}
                    onClick={() => {
                      window.location.href = `/admin/${clientSiteId}/blog/${post.id}`;
                    }}
                    className="cursor-pointer border-b border-border-subtle last:border-0 hover:bg-bg-page-start"
                  >
                    <td className="px-4 py-3 font-medium text-navy">{post.title || "(sans titre)"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-pill px-2.5 py-1 text-xs font-semibold ${
                          post.publishedAt ? "bg-green-accent/15 text-green-accent" : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {post.publishedAt ? "Publié" : "Brouillon"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-text">
                      {new Date(post.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <a
                          href={`/admin/${clientSiteId}/blog/${post.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm font-medium text-brand-mid hover:text-brand-start"
                        >
                          Modifier
                        </a>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPostToDelete(post);
                          }}
                          className="text-sm text-red-500 hover:text-red-600"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-text">
              <span>
                Page {currentPage} sur {pageCount}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                  className="rounded-button border border-border-subtle px-3 py-1.5 font-medium hover:bg-bg-page-start disabled:opacity-40"
                >
                  Précédent
                </button>
                <button
                  type="button"
                  disabled={currentPage >= pageCount}
                  onClick={() => setPage(currentPage + 1)}
                  className="rounded-button border border-border-subtle px-3 py-1.5 font-medium hover:bg-bg-page-start disabled:opacity-40"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {postToDelete && (
        <ConfirmModal
          title={`Supprimer "${postToDelete.title || "cet article"}" ?`}
          message="Cette action est définitive."
          onConfirm={() => handleDelete(postToDelete.id)}
          onCancel={() => setPostToDelete(null)}
        />
      )}
    </div>
  );
}
