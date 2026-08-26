import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import { adminFetch } from "../../hooks/useAdminSession";
import { AddressAutocomplete, inputClass, type BillingClient, type ClientSiteOption } from "./shared";
import Select from "../../components/admin/Select";

const emptyBillingClientForm = {
  clientSiteId: "" as string,
  name: "",
  isCompany: true,
  siret: "",
  address: "",
  email: "",
  phone: "",
  notes: "",
};

function formFromClient(client: BillingClient) {
  return {
    clientSiteId: client.clientSiteId ?? "",
    name: client.name,
    isCompany: client.isCompany,
    siret: client.siret,
    address: client.address,
    email: client.email,
    phone: client.phone,
    notes: client.notes,
  };
}

// Modal unique pour créer ou modifier un client de facturation — le bouton de soumission ne
// devient cliquable qu'une fois le nom renseigné (seule info nécessaire à la création).
function BillingClientFormModal({
  password,
  clientSites,
  editing,
  onClose,
  onSaved,
}: {
  password: string;
  clientSites: ClientSiteOption[];
  editing: BillingClient | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(editing ? formFromClient(editing) : emptyBillingClientForm);
  const [saving, setSaving] = useState(false);

  const missingRequired = !form.name.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const path = editing ? `/api/admin/billing-clients/${editing.id}` : "/api/admin/billing-clients";
    await adminFetch(API_BASE_URL, path, password, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, clientSiteId: form.clientSiteId || null }),
    });
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-card bg-white p-8 shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy">{editing ? "Modifier le client" : "Ajouter un client"}</h2>
          <button type="button" onClick={onClose} className="text-xl leading-none text-gray-text hover:text-navy">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
            Nom / raison sociale
            <input
              className={inputClass}
              placeholder="Nom / raison sociale"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-navy">
            <input
              type="checkbox"
              checked={form.isCompany}
              onChange={(e) => setForm({ ...form, isCompany: e.target.checked })}
              className="h-4 w-4 accent-brand-mid"
            />
            Client professionnel (pas un particulier)
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
            SIRET
            <input
              className={inputClass}
              placeholder="Si professionnel"
              value={form.siret}
              onChange={(e) => setForm({ ...form, siret: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
            Adresse
            <AddressAutocomplete
              password={password}
              value={form.address}
              onChange={(address) => setForm({ ...form, address })}
              placeholder="Adresse"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
            Email
            <input
              className={inputClass}
              type="email"
              placeholder="Email"
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
            Site client lié
            <Select
              className={inputClass}
              value={form.clientSiteId}
              onChange={(clientSiteId) => setForm({ ...form, clientSiteId })}
              options={[
                { value: "", label: "— Pas de site lié (prospect / hors plateforme) —" },
                ...clientSites.map((site) => ({ value: site.id, label: site.name })),
              ]}
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

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={missingRequired || saving}
              className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Enregistrement…" : editing ? "Enregistrer" : "Ajouter"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-button border border-border-subtle px-4 py-2.5 font-semibold text-gray-text hover:bg-bg-page-start"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BillingClientsSection({ password }: { password: string }) {
  const [clients, setClients] = useState<BillingClient[] | null>(null);
  const [clientSites, setClientSites] = useState<ClientSiteOption[]>([]);
  const [modal, setModal] = useState<"create" | BillingClient | null>(null);

  const load = () =>
    adminFetch(API_BASE_URL, "/api/admin/billing-clients", password)
      .then((res) => res.json())
      .then(setClients);

  useEffect(() => {
    load();
    adminFetch(API_BASE_URL, "/api/admin/client-sites", password)
      .then((res) => res.json())
      .then((sites: ClientSiteOption[]) => setClientSites(sites));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: string) => {
    await adminFetch(API_BASE_URL, `/api/admin/billing-clients/${id}`, password, { method: "DELETE" });
    load();
  };

  const siteName = (id: string | null) => (id ? clientSites.find((s) => s.id === id)?.name ?? "Site supprimé" : null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">Clients de facturation</h1>
          <p className="text-sm text-gray-text">
            Les personnes/entreprises à qui tu envoies des devis et factures — un site client existant ou un prospect
            hors plateforme.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal("create")}
          className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white hover:opacity-90"
        >
          + Ajouter un client
        </button>
      </div>

      <section className="rounded-card bg-white p-6 shadow-card">
        {!clients ? (
          <p className="text-gray-text">Chargement…</p>
        ) : clients.length === 0 ? (
          <p className="text-sm text-gray-text">Aucun client de facturation pour l'instant.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {clients.map((client) => (
              <li key={client.id} className="flex flex-col gap-1 rounded-button bg-bg-page-start/60 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-navy">{client.name}</span>
                  <span className="shrink-0 rounded-pill bg-border-subtle/40 px-2.5 py-1 text-xs font-semibold text-gray-text">
                    {client.isCompany ? "Pro" : "Particulier"}
                  </span>
                </div>
                <div className="text-sm text-gray-text">
                  {client.email || "Email non renseigné"}
                  {client.phone && ` · ${client.phone}`}
                </div>
                {siteName(client.clientSiteId) && (
                  <div className="text-sm text-brand-mid">Lié à : {siteName(client.clientSiteId)}</div>
                )}
                <div className="mt-1 flex gap-3 text-sm">
                  <button
                    type="button"
                    onClick={() => setModal(client)}
                    className="font-medium text-brand-mid hover:text-brand-start"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(client.id)}
                    className="font-medium text-red-500 hover:text-red-600"
                  >
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {modal && (
        <BillingClientFormModal
          password={password}
          clientSites={clientSites}
          editing={modal === "create" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
