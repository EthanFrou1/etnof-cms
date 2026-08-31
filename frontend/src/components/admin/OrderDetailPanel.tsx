import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import { adminFetch } from "../../hooks/useAdminSession";

type OrderItem = {
  id: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  sizeLabel: string | null;
};

type StatusChange = {
  id: string;
  fromStatus: string;
  toStatus: string;
  actorLabel: string;
  createdAt: string;
};

type Comment = {
  id: string;
  authorLabel: string;
  text: string;
  createdAt: string;
};

const statusLabel: Record<string, string> = {
  pending: "À traiter",
  fulfilled: "Traitée",
  cancelled: "Annulée",
};

const formatPrice = (value: number) => value.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const formatDate = (iso: string) => new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

const inputClass =
  "w-full rounded-button border border-border-subtle bg-white px-3 py-2 text-sm text-navy placeholder:text-gray-text/60 focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20";

// Contenu de la ligne dépliée d'une commande (OrdersSection.tsx) : articles (déjà là), "Suivi"
// (timeline des changements de statut, voir OrderStatusChange.cs) et commentaires internes (jamais
// visibles du client, voir OrderComment.cs). Chargé seulement à l'ouverture de la ligne — pas
// besoin de récupérer suivi/commentaires pour chaque commande tant qu'on ne l'a pas dépliée.
export default function OrderDetailPanel({
  clientSiteId,
  password,
  orderId,
  orderCreatedAt,
  items,
  total,
}: {
  clientSiteId: string;
  password: string;
  orderId: string;
  orderCreatedAt: string;
  items: OrderItem[];
  total: number;
}) {
  const [statusChanges, setStatusChanges] = useState<StatusChange[] | null>(null);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);

  const loadComments = () =>
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/catalogue/orders/${orderId}/comments`, password)
      .then((res) => res.json())
      .then(setComments);

  useEffect(() => {
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/catalogue/orders/${orderId}/status-changes`, password)
      .then((res) => res.json())
      .then(setStatusChanges);
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientSiteId, orderId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setPosting(true);
    await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/catalogue/orders/${orderId}/comments`, password, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newComment }),
    });
    setNewComment("");
    setPosting(false);
    loadComments();
  };

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-text">Articles</span>
          {items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm text-gray-text">
              <span>
                {item.quantity} × {item.productName}
                {item.sizeLabel && ` (${item.sizeLabel})`}
              </span>
              <span>{formatPrice(item.unitPrice * item.quantity)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-border-subtle pt-1 text-sm font-semibold text-navy">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-text">Suivi</span>
          <div className="flex flex-col gap-1.5 text-sm text-gray-text">
            <div className="flex justify-between gap-3">
              <span>Commande reçue</span>
              <span className="shrink-0 text-xs">{formatDate(orderCreatedAt)}</span>
            </div>
            {!statusChanges ? (
              <span className="text-xs">Chargement…</span>
            ) : (
              statusChanges.map((change) => (
                <div key={change.id} className="flex justify-between gap-3">
                  <span>
                    {statusLabel[change.fromStatus] ?? change.fromStatus} → {statusLabel[change.toStatus] ?? change.toStatus}
                    <span className="text-xs text-gray-text/70"> — {change.actorLabel}</span>
                  </span>
                  <span className="shrink-0 text-xs">{formatDate(change.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-text">
          Commentaires internes (jamais visibles du client)
        </span>
        {!comments ? (
          <span className="text-xs text-gray-text">Chargement…</span>
        ) : comments.length === 0 ? (
          <p className="text-sm text-gray-text/70">Aucun commentaire pour l'instant.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {comments.map((comment) => (
              <div key={comment.id} className="rounded-button border border-border-subtle bg-white p-2.5 text-sm">
                <div className="mb-1 flex items-center justify-between text-xs text-gray-text">
                  <span className="font-medium text-navy">{comment.authorLabel}</span>
                  <span>{formatDate(comment.createdAt)}</span>
                </div>
                <p className="text-gray-text">{comment.text}</p>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={handleAddComment} className="mt-1 flex flex-col gap-2">
          <textarea
            className={inputClass}
            rows={2}
            placeholder="Ajouter un commentaire (ex. colis renvoyé, client injoignable...)"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <button
            type="submit"
            disabled={!newComment.trim() || posting}
            className="self-start rounded-button bg-brand-gradient px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {posting ? "Ajout…" : "Ajouter"}
          </button>
        </form>
      </div>
    </div>
  );
}
