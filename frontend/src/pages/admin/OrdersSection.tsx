import { Fragment, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../config";
import { adminFetch } from "../../hooks/useAdminSession";
import { StatusLegend } from "../../components/admin/StatusLegend";
import Select from "../../components/admin/Select";
import { downloadCsv } from "../../utils/csv";
import OrderDetailPanel from "../../components/admin/OrderDetailPanel";

type OrderItem = {
  id: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  sizeLabel: string | null;
};

type Order = {
  id: string;
  customerName: string;
  customerEmail: string;
  status: "pending" | "fulfilled" | "cancelled";
  total: number;
  createdAt: string;
  items: OrderItem[];
};

type OrdersSectionProps = {
  clientSiteId: string;
  password: string;
};

const statusLabel: Record<Order["status"], string> = {
  pending: "À traiter",
  fulfilled: "Traitée",
  cancelled: "Annulée",
};

const statusBadgeClass: Record<Order["status"], string> = {
  pending: "bg-amber-100 text-amber-700",
  fulfilled: "bg-green-accent/15 text-green-accent",
  cancelled: "bg-red-100 text-red-500",
};

const STATUS_FILTERS: { value: "all" | Order["status"]; label: string }[] = [
  { value: "all", label: "Tous les statuts" },
  { value: "pending", label: "À traiter" },
  { value: "fulfilled", label: "Traitée" },
  { value: "cancelled", label: "Annulée" },
];

const STATUS_LEGEND = [
  { label: statusLabel.pending, badgeClass: statusBadgeClass.pending, description: "Commande reçue, en attente de préparation/expédition." },
  { label: statusLabel.fulfilled, badgeClass: statusBadgeClass.fulfilled, description: "Commande traitée et finalisée." },
  { label: statusLabel.cancelled, badgeClass: statusBadgeClass.cancelled, description: "Commande annulée, ne sera pas honorée." },
];

type SortField = "createdAt" | "total" | "customerName";
type SortDirection = "asc" | "desc";

const formatPrice = (value: number) => value.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

const PAGE_SIZE = 10;

const inputClass =
  "rounded-button border border-border-subtle bg-white px-3 py-2 text-sm text-navy placeholder:text-gray-text/60 focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20";

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) return <span className="text-gray-text/30">↕</span>;
  return <span className="text-navy">{direction === "asc" ? "↑" : "↓"}</span>;
}

export default function OrdersSection({ clientSiteId, password }: OrdersSectionProps) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | Order["status"]>("all");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadOrders = () =>
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/catalogue/orders`, password)
      .then((res) => res.json())
      .then(setOrders);

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateStatus = async (orderId: string, newStatus: Order["status"]) => {
    await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/catalogue/orders/${orderId}/status`, password, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    loadOrders();
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
    if (!orders) return [];

    const query = search.trim().toLowerCase();
    const filtered = orders.filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) return false;
      if (!query) return true;
      return (
        order.customerName.toLowerCase().includes(query) || order.customerEmail.toLowerCase().includes(query)
      );
    });

    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortField === "createdAt") cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else if (sortField === "total") cmp = a.total - b.total;
      else cmp = a.customerName.localeCompare(b.customerName);
      return sortDirection === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [orders, statusFilter, search, sortField, sortDirection]);

  const pageCount = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = filteredSorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Exporte la vue actuelle (recherche + filtre de statut déjà appliqués) plutôt que toutes les
  // commandes sans distinction — cohérent avec ce que le commerçant voit à l'écran au moment du clic.
  const exportCsv = () => {
    downloadCsv(
      `commandes-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Date", "Client", "Email", "Articles", "Total", "Statut"],
      filteredSorted.map((order) => [
        new Date(order.createdAt).toLocaleString("fr-FR"),
        order.customerName,
        order.customerEmail,
        order.items.map((i) => `${i.quantity}x ${i.productName}${i.sizeLabel ? ` (${i.sizeLabel})` : ""}`).join(" | "),
        order.total.toFixed(2),
        statusLabel[order.status],
      ])
    );
  };

  const columnHeaderClass = "cursor-pointer select-none px-4 py-3 text-left hover:text-navy";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold text-navy">Commandes</h1>

      {!orders ? (
        <p className="text-gray-text">Chargement…</p>
      ) : orders.length === 0 ? (
        <section className="rounded-card bg-white p-8 shadow-card">
          <p className="text-gray-text">
            Aucune commande pour l'instant — les commandes passées depuis le catalogue apparaîtront ici.
          </p>
        </section>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <input
              className={`${inputClass} w-64`}
              placeholder="Rechercher un client (nom, email)"
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
                  setStatusFilter(v as "all" | Order["status"]);
                  setPage(1);
                }}
                options={STATUS_FILTERS.map((f) => ({ value: f.value, label: f.label }))}
              />
            </div>
            <StatusLegend items={STATUS_LEGEND} />
            <span className="text-sm text-gray-text">
              {filteredSorted.length} commande{filteredSorted.length > 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={exportCsv}
              className="ml-auto rounded-button border border-border-subtle px-3 py-2 text-sm font-medium text-navy hover:bg-bg-page-start"
            >
              Exporter en CSV
            </button>
          </div>

          <p className="text-xs text-gray-text sm:hidden">← Fais glisser le tableau pour voir plus de colonnes →</p>

          <div className="relative overflow-x-auto rounded-card bg-white shadow-card">
            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent sm:hidden" />
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-xs font-semibold uppercase tracking-[0.05em] text-gray-text">
                  <th className={columnHeaderClass} onClick={() => toggleSort("createdAt")}>
                    <span className="flex items-center gap-1">
                      Date <SortIcon active={sortField === "createdAt"} direction={sortDirection} />
                    </span>
                  </th>
                  <th className={columnHeaderClass} onClick={() => toggleSort("customerName")}>
                    <span className="flex items-center gap-1">
                      Client <SortIcon active={sortField === "customerName"} direction={sortDirection} />
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left">Articles</th>
                  <th className={columnHeaderClass} onClick={() => toggleSort("total")}>
                    <span className="flex items-center gap-1">
                      Total <SortIcon active={sortField === "total"} direction={sortDirection} />
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((order) => (
                  <Fragment key={order.id}>
                    <tr
                      onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                      className="cursor-pointer border-b border-border-subtle last:border-0 hover:bg-bg-page-start"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-gray-text">
                        {new Date(order.createdAt).toLocaleString("fr-FR")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-navy">{order.customerName}</div>
                        <a
                          href={`mailto:${order.customerEmail}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-brand-mid hover:underline"
                        >
                          {order.customerEmail}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-gray-text">
                        {order.items.reduce((n, i) => n + i.quantity, 0)} article
                        {order.items.reduce((n, i) => n + i.quantity, 0) > 1 ? "s" : ""}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-navy">
                        {formatPrice(order.total)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-pill px-2.5 py-1 text-xs font-semibold ${statusBadgeClass[order.status]}`}>
                          {statusLabel[order.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {order.status === "pending" && (
                          <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => updateStatus(order.id, "fulfilled")}
                              className="text-sm font-medium text-brand-mid hover:text-brand-start"
                            >
                              Traitée
                            </button>
                            <button
                              type="button"
                              onClick={() => updateStatus(order.id, "cancelled")}
                              className="text-sm text-red-500 hover:text-red-600"
                            >
                              Annuler
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {expandedId === order.id && (
                      <tr className="border-b border-border-subtle bg-bg-page-start last:border-0">
                        <td colSpan={6} className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <OrderDetailPanel
                            clientSiteId={clientSiteId}
                            password={password}
                            orderId={order.id}
                            orderCreatedAt={order.createdAt}
                            items={order.items}
                            total={order.total}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
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
    </div>
  );
}
