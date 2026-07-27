import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";
import { useAdminSession, adminFetch } from "../hooks/useAdminSession";
import { useModules } from "../hooks/useModules";
import AdminLoginScreen from "../components/admin/AdminLoginScreen";
import AdminLayout from "../components/admin/AdminLayout";

type OrderItem = {
  id: string;
  productName: string;
  unitPrice: number;
  quantity: number;
};

type Order = {
  id: string;
  status: "pending" | "fulfilled" | "cancelled";
  total: number;
  createdAt: string;
  items: OrderItem[];
};

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  createdAt: string;
};

type CustomerDetailPageProps = {
  clientSiteId: string;
  customerId: string;
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

const inputClass =
  "rounded-button border border-border-subtle bg-white px-3 py-2 text-navy placeholder:text-gray-text/60 focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20";

const formatPrice = (value: number) => value.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

function CustomerDetailContent({
  clientSiteId,
  customerId,
  password,
}: {
  clientSiteId: string;
  customerId: string;
  password: string;
}) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [form, setForm] = useState<Customer | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const load = () =>
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/catalogue/customers/${customerId}`, password)
      .then((res) => res.json())
      .then((data: { customer: Customer; orders: Order[] }) => {
        setCustomer(data.customer);
        setForm(data.customer);
        setOrders(data.orders);
      });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!form) return;
    setStatus("saving");
    const res = await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/catalogue/customers/${customerId}`, password, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setStatus(res.ok ? "saved" : "error");
    if (res.ok) load();
  };

  if (!customer || !form) return <p className="text-gray-text">Chargement…</p>;

  const isDirty =
    form.name !== customer.name ||
    form.email !== customer.email ||
    form.phone !== customer.phone ||
    form.address !== customer.address ||
    form.notes !== customer.notes;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <a href={`/admin/${clientSiteId}/customers`} className="text-sm text-brand-mid hover:underline">
          ← Retour aux clients
        </a>
        <h1 className="mt-1 text-2xl font-extrabold text-navy">{customer.name || "(sans nom)"}</h1>
      </div>

      <section className="rounded-card bg-white p-8 shadow-card">
        <h2 className="mb-4 text-lg font-bold text-navy">Informations</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-gray-text">
            Nom
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-text">
            Email
            <input
              className={inputClass}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-text">
            Téléphone
            <input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-text">
            Adresse
            <input className={inputClass} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-text sm:col-span-2">
            Notes
            <textarea className={inputClass} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={status === "saving" || !isDirty}
            className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Enregistrer
          </button>
          {status === "saved" && <p className="text-green-accent">Enregistré.</p>}
          {status === "error" && <p className="text-red-500">Erreur lors de l'enregistrement.</p>}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-navy">
          Commandes {orders && orders.length > 0 && `(${orders.length})`}
        </h2>

        {!orders || orders.length === 0 ? (
          <div className="rounded-card bg-white p-8 shadow-card">
            <p className="text-gray-text">Aucune commande pour ce client.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {orders.map((order) => (
              <article key={order.id} className="rounded-card bg-white p-6 shadow-card">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-xs text-gray-text">{new Date(order.createdAt).toLocaleString("fr-FR")}</span>
                  <span className={`rounded-pill px-2.5 py-1 text-xs font-semibold ${statusBadgeClass[order.status]}`}>
                    {statusLabel[order.status]}
                  </span>
                </div>
                <div className="mt-3 flex flex-col gap-1">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm text-gray-text">
                      <span>
                        {item.quantity} × {item.productName}
                      </span>
                      <span>{formatPrice(item.unitPrice * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-end border-t border-border-subtle pt-3">
                  <span className="font-bold text-navy">{formatPrice(order.total)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function CustomerDetailPage({ clientSiteId, customerId }: CustomerDetailPageProps) {
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

  // Accès direct par URL alors que le module Catalogue n'est pas actif pour ce tenant — même
  // garde que pour /admin/{clientSiteId}/customers (AdminPage.tsx).
  const blocked = modules !== null && !modules?.catalogue?.enabled;

  return (
    <AdminLayout clientSiteId={clientSiteId} activeSection="customers">
      {blocked ? (
        <div className="rounded-card bg-white p-8 shadow-card">
          <p className="text-gray-text">Le module Catalogue n'est pas activé pour ce site — cette page n'est pas disponible.</p>
        </div>
      ) : (
        <CustomerDetailContent clientSiteId={clientSiteId} customerId={customerId} password={password} />
      )}
    </AdminLayout>
  );
}
