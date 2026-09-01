import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import { adminFetch } from "../../hooks/useAdminSession";
import { downloadCsv } from "../../utils/csv";

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
};

type CustomersSectionProps = {
  clientSiteId: string;
  password: string;
};

const inputClass =
  "rounded-button border border-border-subtle bg-white px-3 py-2 text-navy placeholder:text-gray-text/60 focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  postalCode: "",
  city: "",
  country: "France",
  notes: "",
};

const formatPrice = (value: number) => value.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

function AddCustomerModal({
  clientSiteId,
  password,
  onClose,
  onCreated,
}: {
  clientSiteId: string;
  password: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  const handleSubmit = async () => {
    setStatus("saving");
    const res = await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/catalogue/customers`, password, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      setStatus("error");
      return;
    }
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4">
      <div className="w-full max-w-lg rounded-card bg-white p-8 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy">Ajouter un client</h2>
          <button type="button" onClick={onClose} className="text-xl leading-none text-gray-text hover:text-navy">
            ×
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
            Nom
            <input
              className={inputClass}
              placeholder="Nom"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
            Email
            <input
              className={inputClass}
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
            Téléphone
            <input
              className={inputClass}
              placeholder="Téléphone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
            Adresse
            <input
              className={inputClass}
              placeholder="Adresse"
              value={form.addressLine1}
              onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
            Complément d'adresse
            <input
              className={inputClass}
              placeholder="Complément d'adresse"
              value={form.addressLine2}
              onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
            />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
              Code postal
              <input
                className={inputClass}
                placeholder="Code postal"
                value={form.postalCode}
                onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
              Ville
              <input
                className={inputClass}
                placeholder="Ville"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
            Pays
            <input
              className={inputClass}
              placeholder="Pays"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
            Notes
            <textarea
              className={inputClass}
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>

          {status === "error" && <p className="text-red-500">Le client n'a pas pu être créé.</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={status === "saving" || !form.name || !form.email}
              className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {status === "saving" ? "Ajout…" : "Ajouter"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-button border border-border-subtle px-4 py-2.5 font-semibold text-gray-text hover:bg-bg-page-start"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CustomersSection({ clientSiteId, password }: CustomersSectionProps) {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [showModal, setShowModal] = useState(false);

  const loadCustomers = () =>
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/catalogue/customers`, password)
      .then((res) => res.json())
      .then(setCustomers);

  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportCsv = () => {
    if (!customers) return;
    downloadCsv(
      `clients-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Nom", "Email", "Téléphone", "Commandes", "Total dépensé", "Dernière commande"],
      customers.map((c) => [
        c.name,
        c.email,
        c.phone,
        String(c.orderCount),
        c.totalSpent.toFixed(2),
        c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString("fr-FR") : "",
      ])
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">Clients</h1>
          <p className="text-sm text-gray-text">
            {customers ? `${customers.length} client${customers.length > 1 ? "s" : ""}` : "Chargement…"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportCsv}
            disabled={!customers || customers.length === 0}
            className="rounded-button border border-border-subtle px-4 py-2.5 font-medium text-navy hover:bg-bg-page-start disabled:opacity-40"
          >
            Exporter en CSV
          </button>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white hover:opacity-90"
          >
            + Ajouter un client
          </button>
        </div>
      </div>

      {!customers ? null : customers.length === 0 ? (
        <section className="rounded-card bg-white p-8 shadow-card">
          <p className="text-gray-text">
            Aucun client pour l'instant — les clients apparaissent ici dès leur première commande, ou tu peux en
            ajouter un manuellement.
          </p>
        </section>
      ) : (
        <>
          <p className="text-xs text-gray-text sm:hidden">← Fais glisser le tableau pour voir plus de colonnes →</p>
          <div className="relative overflow-x-auto rounded-card bg-white shadow-card">
            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent sm:hidden" />
            <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-xs font-semibold uppercase tracking-[0.05em] text-gray-text">
                <th className="px-4 py-3 text-left">Nom</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Téléphone</th>
                <th className="px-4 py-3 text-left">Commandes</th>
                <th className="px-4 py-3 text-left">Total dépensé</th>
                <th className="px-4 py-3 text-left">Dernière commande</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-b border-border-subtle last:border-0 hover:bg-bg-page-start">
                  <td className="px-4 py-3">
                    <a
                      href={`/admin/${clientSiteId}/customers/${customer.id}`}
                      className="font-medium text-brand-mid hover:underline"
                    >
                      {customer.name || "(sans nom)"}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-gray-text">{customer.email}</td>
                  <td className="px-4 py-3 text-gray-text">{customer.phone || "—"}</td>
                  <td className="px-4 py-3 text-gray-text">{customer.orderCount}</td>
                  <td className="px-4 py-3 font-semibold text-navy">{formatPrice(customer.totalSpent)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-text">
                    {customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString("fr-FR") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}

      {showModal && (
        <AddCustomerModal
          clientSiteId={clientSiteId}
          password={password}
          onClose={() => setShowModal(false)}
          onCreated={loadCustomers}
        />
      )}
    </div>
  );
}
