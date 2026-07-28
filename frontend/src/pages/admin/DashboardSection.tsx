import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import type { ModulesConfig } from "../../hooks/useModules";
import type { SiteContent } from "../../hooks/useContent";
import type { TemplateId } from "../../hooks/useTemplate";
import { adminFetch } from "../../hooks/useAdminSession";
import { TEMPLATES } from "../../templates/registry";
import StatTile from "../../components/charts/StatTile";

type DashboardSectionProps = {
  clientSiteId: string;
  password: string;
};

type ContactMessage = {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
};

type Order = {
  id: string;
  customerName: string;
  status: "pending" | "fulfilled" | "cancelled";
  total: number;
  createdAt: string;
};

type Product = {
  id: string;
  name: string;
  stock: number;
};

type Booking = {
  id: string;
  customerName: string;
  status: "confirmed" | "cancelled";
  startsAt: string;
};

// Un produit est signalé dès que son stock passe à ce seuil ou en dessous — assez bas pour rester
// une vraie alerte plutôt qu'un bruit de fond permanent sur un petit catalogue.
const LOW_STOCK_THRESHOLD = 3;

const formatPrice = (value: number) => value.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

function RecentMessagesCard({ clientSiteId, messages }: { clientSiteId: string; messages: ContactMessage[] | null }) {
  return (
    <section className="rounded-card bg-white p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-navy">Derniers messages</h2>
        <a href={`/admin/${clientSiteId}/messages`} className="text-sm text-brand-mid hover:underline">
          Voir tout →
        </a>
      </div>

      {!messages ? (
        <p className="text-sm text-gray-text">Chargement…</p>
      ) : messages.length === 0 ? (
        <p className="text-sm text-gray-text">Aucun message pour l'instant.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {messages.slice(0, 3).map((m) => (
            <div key={m.id} className="border-b border-border-subtle pb-3 last:border-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-navy">{m.name}</span>
                <span className="shrink-0 text-xs text-gray-text">
                  {new Date(m.createdAt).toLocaleDateString("fr-FR")}
                </span>
              </div>
              <p className="mt-1 truncate text-sm text-gray-text">{m.message}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function PendingOrdersCard({ clientSiteId, orders }: { clientSiteId: string; orders: Order[] | null }) {
  const pending = orders?.filter((o) => o.status === "pending") ?? [];

  return (
    <section className="rounded-card bg-white p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-navy">Commandes à traiter</h2>
        <a href={`/admin/${clientSiteId}/orders`} className="text-sm text-brand-mid hover:underline">
          Voir tout →
        </a>
      </div>

      {!orders ? (
        <p className="text-sm text-gray-text">Chargement…</p>
      ) : pending.length === 0 ? (
        <p className="text-sm text-gray-text">Aucune commande en attente — tout est à jour.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {pending.slice(0, 3).map((o) => (
            <div key={o.id} className="border-b border-border-subtle pb-3 last:border-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-navy">{o.customerName || "Client"}</span>
                <span className="rounded-pill bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                  {formatPrice(o.total)}
                </span>
              </div>
              <span className="text-xs text-gray-text">{new Date(o.createdAt).toLocaleDateString("fr-FR")}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function UpcomingAppointmentsCard({ clientSiteId, bookings }: { clientSiteId: string; bookings: Booking[] | null }) {
  const upcoming = (bookings ?? [])
    .filter((b) => b.status === "confirmed" && new Date(b.startsAt).getTime() > Date.now())
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  return (
    <section className="rounded-card bg-white p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-navy">Rendez-vous à venir</h2>
        <a href={`/admin/${clientSiteId}/rdv`} className="text-sm text-brand-mid hover:underline">
          Voir tout →
        </a>
      </div>

      {!bookings ? (
        <p className="text-sm text-gray-text">Chargement…</p>
      ) : upcoming.length === 0 ? (
        <p className="text-sm text-gray-text">Aucun rendez-vous à venir.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {upcoming.slice(0, 3).map((b) => (
            <div key={b.id} className="border-b border-border-subtle pb-3 last:border-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-navy">{b.customerName}</span>
                <span className="shrink-0 text-xs text-gray-text">
                  {new Date(b.startsAt).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function LowStockAlert({ clientSiteId, products }: { clientSiteId: string; products: Product[] }) {
  return (
    <section className="rounded-card border border-amber-200 bg-amber-50 p-6 shadow-card">
      <h2 className="mb-4 text-lg font-bold text-navy">Stock faible</h2>
      <div className="flex flex-col gap-2">
        {products.map((p) => (
          <a
            key={p.id}
            href={`/admin/${clientSiteId}/products/${p.id}`}
            className="flex items-center justify-between gap-2 rounded-button px-2 py-1.5 text-sm hover:bg-amber-100"
          >
            <span className="font-medium text-navy">{p.name}</span>
            <span className="whitespace-nowrap rounded-pill bg-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-800">
              Stock : {p.stock}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

export default function DashboardSection({ clientSiteId, password }: DashboardSectionProps) {
  const [modules, setModules] = useState<ModulesConfig | null>(null);
  const [content, setContent] = useState<SiteContent | null>(null);
  const [templateId, setTemplateId] = useState<TemplateId | null>(null);
  const [messages, setMessages] = useState<ContactMessage[] | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [bookings, setBookings] = useState<Booking[] | null>(null);

  useEffect(() => {
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/modules`, password)
      .then((res) => res.json())
      .then(setModules);

    fetch(`${API_BASE_URL}/api/t/${clientSiteId}/content`)
      .then((res) => res.json())
      .then(setContent);

    fetch(`${API_BASE_URL}/api/t/${clientSiteId}/template`)
      .then((res) => res.json())
      .then((data: { templateId: TemplateId }) => setTemplateId(data.templateId));

    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/messages`, password)
      .then((res) => res.json())
      .then(setMessages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const catalogueEnabled = Boolean(modules?.catalogue?.enabled);
  const rdvEnabled = Boolean(modules?.rdv?.enabled);

  useEffect(() => {
    if (!catalogueEnabled) return;
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/catalogue/orders`, password)
      .then((res) => res.json())
      .then(setOrders);
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/catalogue/products`, password)
      .then((res) => res.json())
      .then(setProducts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogueEnabled]);

  useEffect(() => {
    if (!rdvEnabled) return;
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/rdv/bookings`, password)
      .then((res) => res.json())
      .then(setBookings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rdvEnabled]);

  const enabledModuleCount = modules ? Object.values(modules).filter((m) => m.enabled).length : 0;
  const templateLabel = TEMPLATES.find((t) => t.id === templateId)?.label ?? "…";
  const lowStockProducts = (products ?? []).filter((p) => p.stock <= LOW_STOCK_THRESHOLD).sort((a, b) => a.stock - b.stock);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold text-navy">Tableau de bord</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Modules actifs" value={modules ? enabledModuleCount : "…"} />
        <StatTile label="Offres" value={content ? content.offers.length : "…"} />
        <StatTile label="Messages reçus" value={messages ? messages.length : "…"} />
        <StatTile label="Mise en page" value={templateLabel} />
      </div>

      {catalogueEnabled && lowStockProducts.length > 0 && (
        <LowStockAlert clientSiteId={clientSiteId} products={lowStockProducts} />
      )}

      {catalogueEnabled || rdvEnabled ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <RecentMessagesCard clientSiteId={clientSiteId} messages={messages} />
          {catalogueEnabled && <PendingOrdersCard clientSiteId={clientSiteId} orders={orders} />}
          {rdvEnabled && <UpcomingAppointmentsCard clientSiteId={clientSiteId} bookings={bookings} />}
        </div>
      ) : (
        <RecentMessagesCard clientSiteId={clientSiteId} messages={messages} />
      )}

      <section className="rounded-card bg-white p-8 shadow-card">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-green-accent">
          Mon site
        </span>
        <h2 className="mb-1 mt-1 text-xl font-extrabold text-navy">{content?.siteName ?? "…"}</h2>
        {content?.description && <p className="text-gray-text">{content.description}</p>}
        <a
          href={`/t/${clientSiteId}`}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block text-sm font-medium text-brand-mid hover:underline"
        >
          Voir le site public ↗
        </a>
      </section>
    </div>
  );
}
