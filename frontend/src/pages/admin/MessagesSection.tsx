import { Fragment, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../config";
import { adminFetch } from "../../hooks/useAdminSession";
import ConfirmModal from "../../components/admin/ConfirmModal";

type ContactMessage = {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
};

type MessagesSectionProps = {
  clientSiteId: string;
  password: string;
};

type SortField = "createdAt" | "name";
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 10;

// En dessous de ce seuil, le message tient déjà en entier dans la colonne "Message" (pas de
// troncature visuelle) : déplier la ligne ne ferait qu'afficher le même texte une deuxième fois.
const EXPAND_THRESHOLD = 80;

const inputClass =
  "rounded-button border border-border-subtle bg-white px-3 py-2 text-sm text-navy placeholder:text-gray-text/60 focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20";

// Lien mailto pré-rempli plutôt qu'un vrai envoi depuis le site : ces messages viennent du
// formulaire de contact public, on n'a pas de service d'envoi d'email intégré (voir CLAUDE.md
// règle 5 — jamais de dépendance externe sans validation). Même principe déjà utilisé ailleurs
// dans l'admin (email des commandes, activation de module).
function replyMailto(message: ContactMessage) {
  const subject = `Re: votre message du ${new Date(message.createdAt).toLocaleDateString("fr-FR")}`;
  const body = [
    `Bonjour ${message.name},`,
    "",
    "",
    "",
    "---",
    `Votre message du ${new Date(message.createdAt).toLocaleString("fr-FR")} :`,
    message.message,
  ].join("\n");
  return `mailto:${message.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) return <span className="text-gray-text/30">↕</span>;
  return <span className="text-navy">{direction === "asc" ? "↑" : "↓"}</span>;
}

export default function MessagesSection({ clientSiteId, password }: MessagesSectionProps) {
  const [messages, setMessages] = useState<ContactMessage[] | null>(null);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<ContactMessage | null>(null);

  const loadMessages = () =>
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/messages`, password)
      .then((res) => res.json())
      .then(setMessages);

  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: string) => {
    setMessageToDelete(null);
    await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/messages/${id}`, password, { method: "DELETE" });
    await loadMessages();
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
    if (!messages) return [];

    const query = search.trim().toLowerCase();
    const filtered = messages.filter((m) => {
      if (!query) return true;
      return m.name.toLowerCase().includes(query) || m.email.toLowerCase().includes(query);
    });

    const sorted = [...filtered].sort((a, b) => {
      const cmp =
        sortField === "createdAt"
          ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          : a.name.localeCompare(b.name);
      return sortDirection === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [messages, search, sortField, sortDirection]);

  const pageCount = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = filteredSorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const columnHeaderClass = "cursor-pointer select-none px-4 py-3 text-left hover:text-navy";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-navy">Messages</h1>
        <p className="mt-1 text-sm text-gray-text">
          Messages envoyés par tes visiteurs depuis le formulaire de contact du site public. Clique
          sur une ligne pour lire le message en entier, ou sur "Répondre" pour ouvrir un email
          pré-rempli vers l'expéditeur.
        </p>
      </div>

      {!messages ? (
        <p className="text-gray-text">Chargement…</p>
      ) : messages.length === 0 ? (
        <section className="rounded-card bg-white p-8 shadow-card">
          <p className="text-gray-text">
            Aucun message pour l'instant — les envois depuis le formulaire de contact du site
            apparaîtront ici.
          </p>
        </section>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <input
              className={`${inputClass} w-64`}
              placeholder="Rechercher (nom, email)"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <span className="text-sm text-gray-text">
              {filteredSorted.length} message{filteredSorted.length > 1 ? "s" : ""}
            </span>
          </div>

          <p className="text-xs text-gray-text sm:hidden">← Fais glisser le tableau pour voir plus de colonnes →</p>

          <div className="relative overflow-x-auto rounded-card bg-white shadow-card">
            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent sm:hidden" />
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-xs font-semibold uppercase tracking-[0.05em] text-gray-text">
                  <th className={columnHeaderClass} onClick={() => toggleSort("createdAt")}>
                    <span className="flex items-center gap-1">
                      Date <SortIcon active={sortField === "createdAt"} direction={sortDirection} />
                    </span>
                  </th>
                  <th className={columnHeaderClass} onClick={() => toggleSort("name")}>
                    <span className="flex items-center gap-1">
                      Nom <SortIcon active={sortField === "name"} direction={sortDirection} />
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left">Message</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((m) => {
                  const expandable = m.message.length > EXPAND_THRESHOLD;
                  return (
                    <Fragment key={m.id}>
                      <tr
                        onClick={expandable ? () => setExpandedId(expandedId === m.id ? null : m.id) : undefined}
                        className={`border-b border-border-subtle last:border-0 ${
                          expandable ? "cursor-pointer hover:bg-bg-page-start" : ""
                        }`}
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-gray-text">
                          {new Date(m.createdAt).toLocaleString("fr-FR")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-navy">{m.name}</div>
                          <a
                            href={`mailto:${m.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-brand-mid hover:underline"
                          >
                            {m.email}
                          </a>
                        </td>
                        <td className="max-w-xs truncate px-4 py-3 text-gray-text">{m.message}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <a
                              href={replyMailto(m)}
                              onClick={(e) => e.stopPropagation()}
                              className="text-sm font-medium text-brand-mid hover:text-brand-start"
                            >
                              Répondre
                            </a>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMessageToDelete(m);
                              }}
                              className="text-sm text-red-500 hover:text-red-600"
                            >
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === m.id && (
                        <tr className="border-b border-border-subtle bg-bg-page-start last:border-0">
                          <td colSpan={4} className="px-4 py-3">
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-text">{m.message}</p>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
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

      {messageToDelete && (
        <ConfirmModal
          title={`Supprimer le message de "${messageToDelete.name}" ?`}
          message="Cette action est définitive."
          onConfirm={() => handleDelete(messageToDelete.id)}
          onCancel={() => setMessageToDelete(null)}
        />
      )}
    </div>
  );
}
