export type ActionLog = {
  id: string;
  actorType: "owner" | "employee" | "agency";
  actorLabel: string;
  action: string;
  method: string;
  path: string;
  statusCode: number;
  createdAt: string;
};

// Couleur par type d'auteur — même esprit que STATUS_STYLES ailleurs dans l'admin (voir
// agency/SitesSection.tsx) : distinguer Propriétaire/Employé/Agence en un coup d'œil.
const ACTOR_STYLES: Record<ActionLog["actorType"], string> = {
  owner: "bg-brand-mid/10 text-brand-mid",
  employee: "bg-border-subtle/60 text-gray-text",
  agency: "bg-amber-100 text-amber-700",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

// Table partagée entre HistorySection.tsx (admin d'un tenant) et le modal "Historique" de
// agency/SitesSection.tsx — même rendu, deux sources de données différentes (owner-only côté tenant,
// mot de passe agence côté dashboard).
export default function ActionLogTable({ logs }: { logs: ActionLog[] | null }) {
  if (!logs) return <p className="text-gray-text">Chargement…</p>;

  if (logs.length === 0) {
    return (
      <section className="rounded-card bg-white p-8 shadow-card">
        <p className="text-sm text-gray-text">Aucune action enregistrée pour l'instant.</p>
      </section>
    );
  }

  return (
    <div className="relative overflow-x-auto rounded-card bg-white shadow-card">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-border-subtle text-xs font-semibold uppercase tracking-[0.05em] text-gray-text">
            <th className="px-4 py-3 text-left">Date</th>
            <th className="px-4 py-3 text-left">Auteur</th>
            <th className="px-4 py-3 text-left">Action</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b border-border-subtle last:border-0 hover:bg-bg-page-start">
              <td className="whitespace-nowrap px-4 py-3 text-gray-text">{formatDate(log.createdAt)}</td>
              <td className="px-4 py-3">
                <span className={`rounded-pill px-2.5 py-1 text-xs font-semibold ${ACTOR_STYLES[log.actorType]}`}>
                  {log.actorLabel}
                </span>
              </td>
              <td className="px-4 py-3 text-navy">{log.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
