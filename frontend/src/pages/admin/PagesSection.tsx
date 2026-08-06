import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import { adminFetch } from "../../hooks/useAdminSession";
import ConfirmModal from "../../components/admin/ConfirmModal";

type CustomPage = {
  id: string;
  title: string;
  slug: string;
  sortOrder: number;
  publishedAt: string | null;
};

type PagesSectionProps = {
  clientSiteId: string;
  password: string;
};

// Liste courte (mentions légales, CGV, à propos...), pas de recherche/pagination comme le Blog —
// juste l'ordre choisi par le client (SortOrder), modifiable par boutons monter/descendre plutôt que
// du glisser-déposer (pas de dépendance externe, voir docs/12-plan-modules-restants.md).
export default function PagesSection({ clientSiteId, password }: PagesSectionProps) {
  const [pages, setPages] = useState<CustomPage[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [pageToDelete, setPageToDelete] = useState<CustomPage | null>(null);

  const loadPages = () =>
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/pages`, password)
      .then((res) => res.json())
      .then(setPages);

  useEffect(() => {
    loadPages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    const res = await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/pages`, password, { method: "POST" });
    const page = (await res.json()) as CustomPage;
    window.location.href = `/admin/${clientSiteId}/pages/${page.id}`;
  };

  const handleDelete = async (id: string) => {
    setPageToDelete(null);
    await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/pages/${id}`, password, { method: "DELETE" });
    await loadPages();
  };

  const handleMove = async (id: string, direction: "up" | "down") => {
    setMovingId(id);
    await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/pages/${id}/move`, password, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    await loadPages();
    setMovingId(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">Pages personnalisées</h1>
          <p className="mt-1 text-sm text-gray-text">
            Pages libres (mentions légales, CGV, à propos...) regroupées sous un menu déroulant dans le header du
            site — configure son intitulé dans l'onglet "Modules". L'ordre ci-dessous est celui du menu.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {creating ? "Création…" : "+ Nouvelle page"}
        </button>
      </div>

      {!pages ? (
        <p className="text-gray-text">Chargement…</p>
      ) : pages.length === 0 ? (
        <section className="rounded-card bg-white p-8 shadow-card">
          <p className="text-gray-text">Aucune page pour l'instant — clique sur "Nouvelle page" pour commencer.</p>
        </section>
      ) : (
        <section className="rounded-card bg-white shadow-card">
          <ul className="flex flex-col">
            {pages.map((page, index) => (
              <li
                key={page.id}
                className="flex items-center gap-3 border-b border-border-subtle p-4 last:border-0"
              >
                <div className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    onClick={() => handleMove(page.id, "up")}
                    disabled={index === 0 || movingId === page.id}
                    aria-label="Monter"
                    className="text-gray-text hover:text-navy disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(page.id, "down")}
                    disabled={index === pages.length - 1 || movingId === page.id}
                    aria-label="Descendre"
                    className="text-gray-text hover:text-navy disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>

                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => {
                    window.location.href = `/admin/${clientSiteId}/pages/${page.id}`;
                  }}
                >
                  <span className="font-medium text-navy">{page.title || "(sans titre)"}</span>
                  <span
                    className={`ml-2 rounded-pill px-2.5 py-1 text-xs font-semibold ${
                      page.publishedAt ? "bg-green-accent/15 text-green-accent" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {page.publishedAt ? "Publiée" : "Brouillon"}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-3 text-sm">
                  <a href={`/admin/${clientSiteId}/pages/${page.id}`} className="font-medium text-brand-mid hover:text-brand-start">
                    Modifier
                  </a>
                  <button type="button" onClick={() => setPageToDelete(page)} className="text-red-500 hover:text-red-600">
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pageToDelete && (
        <ConfirmModal
          title={`Supprimer "${pageToDelete.title || "cette page"}" ?`}
          message="Cette action est définitive."
          onConfirm={() => handleDelete(pageToDelete.id)}
          onCancel={() => setPageToDelete(null)}
        />
      )}
    </div>
  );
}
