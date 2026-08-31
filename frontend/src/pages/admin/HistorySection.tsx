import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import { adminFetch } from "../../hooks/useAdminSession";
import ActionLogTable, { type ActionLog } from "../../components/admin/ActionLogTable";

type HistorySectionProps = {
  clientSiteId: string;
  password: string;
};

const PAGE_SIZE = 20;

// Historique des actions du site (voir backend/AdminActionLog.cs) — owner-only (comme Comptes/
// Modules/Stripe), un compte Employé n'a pas accès à cette page. Charge les 20 dernières actions,
// "Charger plus" ajoute les 20 suivantes à la liste déjà affichée plutôt que de remplacer une page
// par une autre — plus simple à suivre pour parcourir loin dans le passé.
export default function HistorySection({ clientSiteId, password }: HistorySectionProps) {
  const [logs, setLogs] = useState<ActionLog[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = (skip: number) => {
    const setLoading = skip === 0 ? () => {} : setLoadingMore;
    setLoading(true);
    return adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/action-logs?skip=${skip}&take=${PAGE_SIZE}`, password)
      .then((res) => res.json())
      .then((data: { items: ActionLog[]; hasMore: boolean }) => {
        setLogs((current) => (skip === 0 ? data.items : [...(current ?? []), ...data.items]));
        setHasMore(data.hasMore);
        setLoading(false);
      });
  };

  useEffect(() => {
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-navy">Historique</h1>
        <p className="text-sm text-gray-text">
          Actions effectuées sur ce site (Propriétaire, comptes Employé, agence) — utile en cas de doute sur un
          changement.
        </p>
      </div>

      <ActionLogTable logs={logs} />

      {hasMore && (
        <button
          type="button"
          onClick={() => load(logs?.length ?? 0)}
          disabled={loadingMore}
          className="self-center rounded-button border border-border-subtle px-4 py-2 text-sm font-medium text-navy hover:bg-bg-page-start disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loadingMore ? "Chargement…" : "Charger plus"}
        </button>
      )}
    </div>
  );
}
