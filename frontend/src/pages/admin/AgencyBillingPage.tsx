import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import { useAdminSession, adminFetch } from "../../hooks/useAdminSession";
import AdminLoginForm from "../../components/AdminLoginForm";
import { IconInvoice } from "../../components/admin/icons";

// Facturation & devis de l'agence elle-même (etnof-web) — pas un module tenant, réservé à Ethan.
// Voir docs/13-facturation-devis.md pour le contexte et docs/07-admin-global.md pour la section
// dédiée. Onglets ajoutés au fur et à mesure des étapes (Entreprise -> Clients -> Devis -> Factures).
type TabId = "entreprise" | "clients" | "formules" | "devis" | "factures" | "paiement";

const TABS: { id: TabId; label: string }[] = [
  { id: "entreprise", label: "Entreprise" },
  { id: "clients", label: "Clients" },
  { id: "formules", label: "Formules" },
  { id: "devis", label: "Devis" },
  { id: "factures", label: "Factures" },
  { id: "paiement", label: "Paiement" },
];

const inputClass =
  "rounded-button border border-border-subtle bg-white px-3 py-2 text-navy placeholder:text-gray-text/60 focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20";

type CompanyProfile = {
  id: string;
  legalName: string;
  tradeName: string;
  legalForm: string;
  siret: string;
  address: string;
  email: string;
  phone: string;
  vatMention: string;
  iban: string;
  bic: string;
  latePaymentMention: string;
  cgvUrl: string;
  websiteUrl: string;
  logoPath: string | null;
  updatedAt: string;
};

type CompanyProfileFormFields = Pick<
  CompanyProfile,
  | "legalName"
  | "tradeName"
  | "legalForm"
  | "siret"
  | "address"
  | "email"
  | "phone"
  | "vatMention"
  | "iban"
  | "bic"
  | "latePaymentMention"
  | "cgvUrl"
  | "websiteUrl"
>;

function toFormFields(profile: CompanyProfile): CompanyProfileFormFields {
  const {
    legalName,
    tradeName,
    legalForm,
    siret,
    address,
    email,
    phone,
    vatMention,
    iban,
    bic,
    latePaymentMention,
    cgvUrl,
    websiteUrl,
  } = profile;
  return {
    legalName,
    tradeName,
    legalForm,
    siret,
    address,
    email,
    phone,
    vatMention,
    iban,
    bic,
    latePaymentMention,
    cgvUrl,
    websiteUrl,
  };
}

function CompanyProfilePanel({ password }: { password: string }) {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [form, setForm] = useState<CompanyProfileFormFields | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const load = () =>
    adminFetch(API_BASE_URL, "/api/admin/company-profile", password)
      .then((res) => res.json())
      .then((data: CompanyProfile) => {
        setProfile(data);
        setForm(toFormFields(data));
      });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDirty = Boolean(profile && form && JSON.stringify(form) !== JSON.stringify(toFormFields(profile)));

  const handleChange = (field: keyof CompanyProfileFormFields, value: string) => {
    setForm((f) => (f ? { ...f, [field]: value } : f));
  };

  const handleSave = async () => {
    if (!form) return;
    setSaveStatus("saving");
    const res = await adminFetch(API_BASE_URL, "/api/admin/company-profile", password, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const updated: CompanyProfile = await res.json();
      setProfile(updated);
      setForm(toFormFields(updated));
      setSaveStatus("saved");
    } else {
      setSaveStatus("error");
    }
  };

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    const body = new FormData();
    body.append("file", file);
    const res = await adminFetch(API_BASE_URL, "/api/admin/company-profile/logo", password, { method: "POST", body });
    if (res.ok) setProfile(await res.json());
    setUploadingLogo(false);
  };

  if (!profile || !form) return <p className="text-gray-text">Chargement…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">Entreprise</h1>
          <p className="text-sm text-gray-text">
            Infos utilisées sur tes devis et factures (mentions légales obligatoires en France).
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveStatus === "saved" && <span className="text-sm text-green-accent">Enregistré</span>}
          {saveStatus === "error" && <span className="text-sm text-red-500">Erreur lors de l'enregistrement.</span>}
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || saveStatus === "saving"}
            className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saveStatus === "saving" ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>

      <section className="grid gap-6 rounded-card bg-white p-8 shadow-card lg:grid-cols-[1fr_220px]">
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-text">
              Raison sociale
              <input
                className={`mt-1 w-full ${inputClass}`}
                value={form.legalName}
                onChange={(e) => handleChange("legalName", e.target.value)}
              />
            </label>
            <label className="text-sm font-medium text-gray-text">
              Nom commercial
              <input
                className={`mt-1 w-full ${inputClass}`}
                value={form.tradeName}
                onChange={(e) => handleChange("tradeName", e.target.value)}
              />
            </label>
            <label className="text-sm font-medium text-gray-text">
              Forme juridique
              <input
                className={`mt-1 w-full ${inputClass}`}
                placeholder="ex : Auto-entrepreneur"
                value={form.legalForm}
                onChange={(e) => handleChange("legalForm", e.target.value)}
              />
            </label>
            <label className="text-sm font-medium text-gray-text">
              SIRET
              <input
                className={`mt-1 w-full ${inputClass}`}
                value={form.siret}
                onChange={(e) => handleChange("siret", e.target.value)}
              />
            </label>
          </div>

          <label className="text-sm font-medium text-gray-text">
            Adresse
            <input
              className={`mt-1 w-full ${inputClass}`}
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-text">
              Email
              <input
                type="email"
                className={`mt-1 w-full ${inputClass}`}
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
              />
            </label>
            <label className="text-sm font-medium text-gray-text">
              Téléphone
              <input
                className={`mt-1 w-full ${inputClass}`}
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
              />
            </label>
          </div>

          <label className="text-sm font-medium text-gray-text">
            Mention TVA (affichée sur chaque document)
            <input
              className={`mt-1 w-full ${inputClass}`}
              value={form.vatMention}
              onChange={(e) => handleChange("vatMention", e.target.value)}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-text">
              IBAN
              <input
                className={`mt-1 w-full ${inputClass}`}
                value={form.iban}
                onChange={(e) => handleChange("iban", e.target.value)}
              />
            </label>
            <label className="text-sm font-medium text-gray-text">
              BIC
              <input
                className={`mt-1 w-full ${inputClass}`}
                value={form.bic}
                onChange={(e) => handleChange("bic", e.target.value)}
              />
            </label>
          </div>

          <label className="text-sm font-medium text-gray-text">
            Mention pénalités de retard (pied de facture)
            <textarea
              className={`mt-1 w-full ${inputClass}`}
              rows={3}
              value={form.latePaymentMention}
              onChange={(e) => handleChange("latePaymentMention", e.target.value)}
            />
          </label>

          <label className="text-sm font-medium text-gray-text">
            Lien vers les CGV
            <input
              className={`mt-1 w-full ${inputClass}`}
              value={form.cgvUrl}
              onChange={(e) => handleChange("cgvUrl", e.target.value)}
            />
          </label>

          <label className="text-sm font-medium text-gray-text">
            Site web (affiché en pied des emails de confirmation)
            <input
              className={`mt-1 w-full ${inputClass}`}
              value={form.websiteUrl}
              onChange={(e) => handleChange("websiteUrl", e.target.value)}
            />
          </label>
        </div>

        <div className="flex flex-col items-center gap-3">
          <span className="text-sm font-medium text-gray-text">Logo</span>
          <div className="flex h-28 w-full items-center justify-center overflow-hidden rounded-button border border-dashed border-border-subtle bg-bg-page-start/60">
            {profile.logoPath ? (
              <img src={`${API_BASE_URL}${profile.logoPath}`} alt="Logo" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-xs text-gray-text">Aucun logo</span>
            )}
          </div>
          <label className="cursor-pointer rounded-button border border-border-subtle px-3 py-2 text-sm font-medium text-gray-text hover:bg-bg-page-start">
            {uploadingLogo ? "Envoi…" : profile.logoPath ? "Changer le logo" : "Ajouter un logo"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              className="hidden"
              disabled={uploadingLogo}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoUpload(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </section>
    </div>
  );
}

type BillingClient = {
  id: string;
  clientSiteId: string | null;
  name: string;
  isCompany: boolean;
  siret: string;
  address: string;
  email: string;
  phone: string;
  notes: string;
  createdAt: string;
};

type ClientSiteOption = { id: string; name: string };

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

function BillingClientsPanel({ password }: { password: string }) {
  const [clients, setClients] = useState<BillingClient[] | null>(null);
  const [clientSites, setClientSites] = useState<ClientSiteOption[]>([]);
  const [form, setForm] = useState(emptyBillingClientForm);
  const [originalForm, setOriginalForm] = useState(emptyBillingClientForm);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const startEdit = (client: BillingClient) => {
    setEditingId(client.id);
    const next = {
      clientSiteId: client.clientSiteId ?? "",
      name: client.name,
      isCompany: client.isCompany,
      siret: client.siret,
      address: client.address,
      email: client.email,
      phone: client.phone,
      notes: client.notes,
    };
    setForm(next);
    setOriginalForm(next);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyBillingClientForm);
    setOriginalForm(emptyBillingClientForm);
  };

  const isDirty = editingId ? JSON.stringify(form) !== JSON.stringify(originalForm) : true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = editingId ? `/api/admin/billing-clients/${editingId}` : "/api/admin/billing-clients";
    await adminFetch(API_BASE_URL, path, password, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, clientSiteId: form.clientSiteId || null }),
    });
    cancelEdit();
    load();
  };

  const handleDelete = async (id: string) => {
    await adminFetch(API_BASE_URL, `/api/admin/billing-clients/${id}`, password, { method: "DELETE" });
    load();
  };

  const siteName = (id: string | null) => (id ? clientSites.find((s) => s.id === id)?.name ?? "Site supprimé" : null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-navy">Clients de facturation</h1>
        <p className="text-sm text-gray-text">
          Les personnes/entreprises à qui tu envoies des devis et factures — un site client existant ou un prospect
          hors plateforme.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
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
                      onClick={() => startEdit(client)}
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

        <section className="rounded-card bg-white p-6 shadow-card">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.05em] text-gray-text">
            {editingId ? "Modifier le client" : "Ajouter un client"}
          </h3>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              className={inputClass}
              placeholder="Nom / raison sociale"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <label className="flex items-center gap-2 text-sm text-navy">
              <input
                type="checkbox"
                checked={form.isCompany}
                onChange={(e) => setForm({ ...form, isCompany: e.target.checked })}
                className="h-4 w-4 accent-brand-mid"
              />
              Client professionnel (pas un particulier)
            </label>
            <input
              className={inputClass}
              placeholder="SIRET (si pro)"
              value={form.siret}
              onChange={(e) => setForm({ ...form, siret: e.target.value })}
            />
            <input
              className={inputClass}
              placeholder="Adresse"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <input
              className={inputClass}
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <input
              className={inputClass}
              placeholder="Téléphone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <select
              className={inputClass}
              value={form.clientSiteId}
              onChange={(e) => setForm({ ...form, clientSiteId: e.target.value })}
            >
              <option value="">— Pas de site lié (prospect / hors plateforme) —</option>
              {clientSites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
            <textarea
              className={inputClass}
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!isDirty}
                className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {editingId ? "Enregistrer" : "Ajouter"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-button border border-border-subtle px-4 py-2.5 font-semibold text-gray-text hover:bg-bg-page-start"
                >
                  Annuler
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

type PackageOffer = { id: string; name: string; price: string };

const emptyPackageOfferForm = { name: "", price: "" };

function PackageOffersPanel({ password }: { password: string }) {
  const [offers, setOffers] = useState<PackageOffer[] | null>(null);
  const [form, setForm] = useState(emptyPackageOfferForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = () =>
    adminFetch(API_BASE_URL, "/api/admin/package-offers", password)
      .then((res) => res.json())
      .then(setOffers);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyPackageOfferForm);
  };

  const startEdit = (offer: PackageOffer) => {
    setEditingId(offer.id);
    setForm({ name: offer.name, price: offer.price });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = editingId ? `/api/admin/package-offers/${editingId}` : "/api/admin/package-offers";
    await adminFetch(API_BASE_URL, path, password, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    cancelEdit();
    load();
  };

  const handleDelete = async (id: string) => {
    await adminFetch(API_BASE_URL, `/api/admin/package-offers/${id}`, password, { method: "DELETE" });
    if (editingId === id) cancelEdit();
    load();
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-navy">Formules</h1>
        <p className="text-sm text-gray-text">
          Tes formules de base (Essentiel, Business, Sur mesure...) — utilisables pour préremplir rapidement une
          ligne de devis/facture, en plus de tes modules à la carte.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <section className="rounded-card bg-white p-6 shadow-card">
          {!offers ? (
            <p className="text-gray-text">Chargement…</p>
          ) : offers.length === 0 ? (
            <p className="text-sm text-gray-text">Aucune formule pour l'instant.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {offers.map((offer) => (
                <li key={offer.id} className="flex items-center justify-between gap-3 rounded-button bg-bg-page-start/60 p-4">
                  <div>
                    <span className="font-semibold text-navy">{offer.name}</span>
                    <span className="ml-3 text-sm text-gray-text">{offer.price}</span>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <button type="button" onClick={() => startEdit(offer)} className="font-medium text-brand-mid hover:text-brand-start">
                      Modifier
                    </button>
                    <button type="button" onClick={() => handleDelete(offer.id)} className="font-medium text-red-500 hover:text-red-600">
                      Supprimer
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-card bg-white p-6 shadow-card">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.05em] text-gray-text">
            {editingId ? "Modifier la formule" : "Ajouter une formule"}
          </h3>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              className={inputClass}
              placeholder="Nom (ex : Essentiel)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              className={inputClass}
              placeholder="Prix (ex : 690€)"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              required
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90"
              >
                {editingId ? "Enregistrer" : "Ajouter"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-button border border-border-subtle px-4 py-2.5 font-semibold text-gray-text hover:bg-bg-page-start"
                >
                  Annuler
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

type QuoteLine = { label: string; quantity: number; unitPrice: number };

type ModuleTariff = { name: string; displayName: string; price: string };

// "690€", "Offert", "" -> 0 — même principe que onlyDigits() côté ModulesSection.tsx/AgencyDashboardPage.tsx
// pour les prix de modules (texte libre, seuls les chiffres comptent).
const parsePriceToNumber = (priceText: string): number => {
  const digits = priceText.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
};

// Sélecteur partagé Devis/Factures : pioche une ligne préremplie depuis les formules de base
// (PackageOffer) ou les modules à la carte déjà tarifés (ModulePrice, via /api/admin/modules).
function TariffPicker({ password, onPick }: { password: string; onPick: (line: QuoteLine) => void }) {
  const [offers, setOffers] = useState<PackageOffer[]>([]);
  const [modules, setModules] = useState<ModuleTariff[]>([]);

  useEffect(() => {
    adminFetch(API_BASE_URL, "/api/admin/package-offers", password)
      .then((res) => res.json())
      .then(setOffers);
    adminFetch(API_BASE_URL, "/api/admin/modules", password)
      .then((res) => res.json())
      .then((data: ModuleTariff[]) => setModules(data.filter((m) => m.price)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [kind, id] = e.target.value.split(":");
    if (kind === "offer") {
      const offer = offers.find((o) => o.id === id);
      if (offer) onPick({ label: offer.name, quantity: 1, unitPrice: parsePriceToNumber(offer.price) });
    } else if (kind === "module") {
      const mod = modules.find((m) => m.name === id);
      if (mod) onPick({ label: mod.displayName, quantity: 1, unitPrice: parsePriceToNumber(mod.price) });
    }
    e.target.value = "";
  };

  if (offers.length === 0 && modules.length === 0) return null;

  return (
    <select className={`${inputClass} text-sm`} defaultValue="" onChange={handleChange}>
      <option value="" disabled>
        + Ajouter depuis mes tarifs
      </option>
      {offers.length > 0 && (
        <optgroup label="Formules">
          {offers.map((o) => (
            <option key={o.id} value={`offer:${o.id}`}>
              {o.name} — {o.price}
            </option>
          ))}
        </optgroup>
      )}
      {modules.length > 0 && (
        <optgroup label="Modules">
          {modules.map((m) => (
            <option key={m.name} value={`module:${m.name}`}>
              {m.displayName} — {m.price}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}

type QuoteListItem = {
  id: string;
  number: string;
  status: string;
  issueDate: string;
  validUntil: string;
  totalHt: number;
  billingClientId: string;
  clientName: string;
};

type QuoteDetail = {
  id: string;
  number: string;
  billingClientId: string;
  status: string;
  lines: QuoteLine[];
  notes: string;
};

const QUOTE_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  refused: "Refusé",
  expired: "Expiré",
};

const QUOTE_STATUS_STYLES: Record<string, string> = {
  draft: "bg-border-subtle/40 text-gray-text",
  sent: "bg-brand-mid/10 text-brand-mid",
  accepted: "bg-green-accent/10 text-green-accent",
  refused: "bg-red-100 text-red-600",
  expired: "bg-amber-100 text-amber-700",
};

const formatPrice = (value: number) => `${value.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`;

const emptyQuoteLine: QuoteLine = { label: "", quantity: 1, unitPrice: 0 };
const emptyQuoteForm = { billingClientId: "", lines: [{ ...emptyQuoteLine }], notes: "" };

const INVOICE_TYPE_OPTIONS: { id: string; label: string }[] = [
  { id: "acompte", label: "Acompte" },
  { id: "solde", label: "Solde" },
  { id: "unique", label: "Facture unique" },
];

function CreateInvoiceFromQuote({
  quoteId,
  password,
  onCreated,
}: {
  quoteId: string;
  password: string;
  onCreated: () => void;
}) {
  const [invoiceType, setInvoiceType] = useState("acompte");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    await adminFetch(API_BASE_URL, `/api/admin/quotes/${quoteId}/create-invoice`, password, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceType }),
    });
    setCreating(false);
    setCreated(true);
    onCreated();
  };

  if (created) {
    return <p className="text-sm text-green-accent">Brouillon de facture créé — à finaliser dans l'onglet Factures.</p>;
  }

  return (
    <div className="flex items-center gap-2">
      <select className={`${inputClass} py-1.5 text-sm`} value={invoiceType} onChange={(e) => setInvoiceType(e.target.value)}>
        {INVOICE_TYPE_OPTIONS.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleCreate}
        disabled={creating}
        className="rounded-button border border-border-subtle px-3 py-1.5 text-sm font-medium text-gray-text hover:bg-bg-page-start disabled:opacity-40"
      >
        {creating ? "Création…" : "Créer une facture"}
      </button>
    </div>
  );
}

function QuotesPanel({ password }: { password: string }) {
  const [quotes, setQuotes] = useState<QuoteListItem[] | null>(null);
  const [clients, setClients] = useState<BillingClient[]>([]);
  const [form, setForm] = useState(emptyQuoteForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const load = () =>
    adminFetch(API_BASE_URL, "/api/admin/quotes", password)
      .then((res) => res.json())
      .then(setQuotes);

  useEffect(() => {
    load();
    adminFetch(API_BASE_URL, "/api/admin/billing-clients", password)
      .then((res) => res.json())
      .then(setClients);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyQuoteForm);
  };

  const startEdit = async (id: string) => {
    const res = await adminFetch(API_BASE_URL, `/api/admin/quotes/${id}`, password);
    const detail: QuoteDetail = await res.json();
    setEditingId(id);
    setForm({ billingClientId: detail.billingClientId, lines: detail.lines, notes: detail.notes });
  };

  const updateLine = (index: number, patch: Partial<QuoteLine>) => {
    setForm((f) => ({ ...f, lines: f.lines.map((l, i) => (i === index ? { ...l, ...patch } : l)) }));
  };

  const addLine = () => setForm((f) => ({ ...f, lines: [...f.lines, { ...emptyQuoteLine }] }));
  const pickLine = (line: QuoteLine) => setForm((f) => ({ ...f, lines: [...f.lines, line] }));
  const removeLine = (index: number) => setForm((f) => ({ ...f, lines: f.lines.filter((_, i) => i !== index) }));

  const total = form.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = editingId ? `/api/admin/quotes/${editingId}` : "/api/admin/quotes";
    await adminFetch(API_BASE_URL, path, password, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    cancelEdit();
    load();
  };

  const handleSend = async (id: string) => {
    await adminFetch(API_BASE_URL, `/api/admin/quotes/${id}/send`, password, { method: "POST" });
    load();
  };

  const handleDelete = async (id: string) => {
    await adminFetch(API_BASE_URL, `/api/admin/quotes/${id}`, password, { method: "DELETE" });
    if (editingId === id) cancelEdit();
    load();
  };

  const handleDownloadPdf = async (quote: QuoteListItem) => {
    setDownloadingId(quote.id);
    const res = await adminFetch(API_BASE_URL, `/api/admin/quotes/${quote.id}/pdf`, password);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `devis-${quote.number}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
    setDownloadingId(null);
  };

  const publicUrl = (id: string) => `${window.location.origin}/devis/${id}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-navy">Devis</h1>
        <p className="text-sm text-gray-text">
          Un devis brouillon peut être modifié ou supprimé ; une fois envoyé, le client l'accepte via un lien public.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <section className="rounded-card bg-white p-6 shadow-card">
          {!quotes ? (
            <p className="text-gray-text">Chargement…</p>
          ) : quotes.length === 0 ? (
            <p className="text-sm text-gray-text">Aucun devis pour l'instant.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {quotes.map((quote) => (
                <li key={quote.id} className="flex flex-col gap-1 rounded-button bg-bg-page-start/60 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-navy">
                      {quote.number} — {quote.clientName}
                    </span>
                    <span
                      className={`shrink-0 rounded-pill px-2.5 py-1 text-xs font-semibold ${
                        QUOTE_STATUS_STYLES[quote.status] ?? "bg-border-subtle/40 text-gray-text"
                      }`}
                    >
                      {QUOTE_STATUS_LABELS[quote.status] ?? quote.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-text">
                    {formatPrice(quote.totalHt)} · valable jusqu'au{" "}
                    {new Date(quote.validUntil).toLocaleDateString("fr-FR")}
                  </div>
                  {quote.status !== "draft" && (
                    <a
                      href={publicUrl(quote.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-brand-mid hover:underline"
                    >
                      Lien public ↗
                    </a>
                  )}
                  <div className="mt-1 flex flex-wrap gap-3 text-sm">
                    {quote.status === "draft" && (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(quote.id)}
                          className="font-medium text-brand-mid hover:text-brand-start"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSend(quote.id)}
                          className="font-medium text-brand-mid hover:text-brand-start"
                        >
                          Envoyer
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(quote.id)}
                          className="font-medium text-red-500 hover:text-red-600"
                        >
                          Supprimer
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(quote)}
                      disabled={downloadingId === quote.id}
                      className="font-medium text-gray-text hover:text-navy disabled:opacity-40"
                    >
                      {downloadingId === quote.id ? "Téléchargement…" : "Télécharger PDF"}
                    </button>
                  </div>
                  {quote.status === "accepted" && (
                    <div className="mt-2">
                      <CreateInvoiceFromQuote quoteId={quote.id} password={password} onCreated={load} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-card bg-white p-6 shadow-card">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.05em] text-gray-text">
            {editingId ? "Modifier le devis" : "Créer un devis"}
          </h3>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <select
              className={inputClass}
              value={form.billingClientId}
              onChange={(e) => setForm({ ...form, billingClientId: e.target.value })}
              required
            >
              <option value="" disabled>
                — Choisir un client —
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <div className="flex flex-col gap-2">
              {form.lines.map((line, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className={`${inputClass} flex-1`}
                    placeholder="Désignation"
                    value={line.label}
                    onChange={(e) => updateLine(i, { label: e.target.value })}
                    required
                  />
                  <input
                    className={`${inputClass} w-16`}
                    type="number"
                    min="0"
                    step="0.5"
                    value={line.quantity}
                    onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })}
                  />
                  <input
                    className={`${inputClass} w-24`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.unitPrice}
                    onChange={(e) => updateLine(i, { unitPrice: Number(e.target.value) })}
                  />
                  {form.lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(i)}
                      className="shrink-0 text-lg leading-none text-gray-text hover:text-red-500"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={addLine} className="text-sm font-medium text-brand-mid hover:text-brand-start">
                  + Ajouter une ligne
                </button>
                <TariffPicker password={password} onPick={pickLine} />
              </div>
            </div>

            <div className="text-right text-sm font-semibold text-navy">Total HT : {formatPrice(total)}</div>

            <textarea
              className={inputClass}
              placeholder="Notes (visibles par le client)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!form.billingClientId}
                className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {editingId ? "Enregistrer" : "Créer le devis"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-button border border-border-subtle px-4 py-2.5 font-semibold text-gray-text hover:bg-bg-page-start"
                >
                  Annuler
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

type InvoiceListItem = {
  id: string;
  number: string | null;
  invoiceType: string;
  status: string;
  issueDate: string;
  dueDate: string;
  totalHt: number;
  isFinalized: boolean;
  billingClientId: string;
  clientName: string;
};

type InvoiceDetail = {
  id: string;
  billingClientId: string;
  quoteId: string | null;
  invoiceType: string;
  lines: QuoteLine[];
  notes: string;
};

const INVOICE_TYPE_LABELS: Record<string, string> = {
  acompte: "Acompte",
  solde: "Solde",
  unique: "Facture unique",
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  paid: "Payée",
  overdue: "En retard",
  cancelled: "Annulée",
};

const INVOICE_STATUS_STYLES: Record<string, string> = {
  draft: "bg-border-subtle/40 text-gray-text",
  sent: "bg-brand-mid/10 text-brand-mid",
  paid: "bg-green-accent/10 text-green-accent",
  overdue: "bg-red-100 text-red-600",
  cancelled: "bg-border-subtle/40 text-gray-text line-through",
};

const emptyInvoiceForm = { billingClientId: "", quoteId: null as string | null, invoiceType: "unique", lines: [{ ...emptyQuoteLine }], notes: "" };

function InvoicesPanel({ password }: { password: string }) {
  const [invoices, setInvoices] = useState<InvoiceListItem[] | null>(null);
  const [clients, setClients] = useState<BillingClient[]>([]);
  const [form, setForm] = useState(emptyInvoiceForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const load = () =>
    adminFetch(API_BASE_URL, "/api/admin/invoices", password)
      .then((res) => res.json())
      .then(setInvoices);

  useEffect(() => {
    load();
    adminFetch(API_BASE_URL, "/api/admin/billing-clients", password)
      .then((res) => res.json())
      .then(setClients);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyInvoiceForm);
  };

  const startEdit = async (id: string) => {
    const res = await adminFetch(API_BASE_URL, `/api/admin/invoices/${id}`, password);
    const detail: InvoiceDetail = await res.json();
    setEditingId(id);
    setForm({
      billingClientId: detail.billingClientId,
      quoteId: detail.quoteId,
      invoiceType: detail.invoiceType,
      lines: detail.lines,
      notes: detail.notes,
    });
  };

  const updateLine = (index: number, patch: Partial<QuoteLine>) => {
    setForm((f) => ({ ...f, lines: f.lines.map((l, i) => (i === index ? { ...l, ...patch } : l)) }));
  };
  const addLine = () => setForm((f) => ({ ...f, lines: [...f.lines, { ...emptyQuoteLine }] }));
  const pickLine = (line: QuoteLine) => setForm((f) => ({ ...f, lines: [...f.lines, line] }));
  const removeLine = (index: number) => setForm((f) => ({ ...f, lines: f.lines.filter((_, i) => i !== index) }));
  const total = form.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = editingId ? `/api/admin/invoices/${editingId}` : "/api/admin/invoices";
    await adminFetch(API_BASE_URL, path, password, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    cancelEdit();
    load();
  };

  const handleFinalize = async (id: string) => {
    if (!window.confirm("Finaliser cette facture ? Elle recevra un numéro définitif et ne pourra plus être modifiée.")) return;
    await adminFetch(API_BASE_URL, `/api/admin/invoices/${id}/finalize`, password, { method: "POST" });
    load();
  };

  const handleMarkPaid = async (id: string) => {
    await adminFetch(API_BASE_URL, `/api/admin/invoices/${id}/mark-paid`, password, { method: "POST" });
    load();
  };

  const handleCancel = async (id: string) => {
    await adminFetch(API_BASE_URL, `/api/admin/invoices/${id}/cancel`, password, { method: "POST" });
    load();
  };

  const handleDelete = async (id: string) => {
    await adminFetch(API_BASE_URL, `/api/admin/invoices/${id}`, password, { method: "DELETE" });
    if (editingId === id) cancelEdit();
    load();
  };

  const handleDownloadPdf = async (invoice: InvoiceListItem) => {
    setDownloadingId(invoice.id);
    const res = await adminFetch(API_BASE_URL, `/api/admin/invoices/${invoice.id}/pdf`, password);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `facture-${invoice.number ?? "brouillon"}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
    setDownloadingId(null);
  };

  const isOverdue = (invoice: InvoiceListItem) => invoice.status === "sent" && new Date(invoice.dueDate) < new Date();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-navy">Factures</h1>
        <p className="text-sm text-gray-text">
          Le numéro n'est attribué qu'à la finalisation (séquence légale sans trou) — une facture finalisée ne peut
          plus être modifiée ni supprimée, seulement annulée.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <section className="rounded-card bg-white p-6 shadow-card">
          {!invoices ? (
            <p className="text-gray-text">Chargement…</p>
          ) : invoices.length === 0 ? (
            <p className="text-sm text-gray-text">Aucune facture pour l'instant.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {invoices.map((invoice) => {
                const effectiveStatus = isOverdue(invoice) ? "overdue" : invoice.status;
                return (
                  <li key={invoice.id} className="flex flex-col gap-1 rounded-button bg-bg-page-start/60 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-navy">
                        {invoice.number ?? "Brouillon"} — {invoice.clientName}
                      </span>
                      <span
                        className={`shrink-0 rounded-pill px-2.5 py-1 text-xs font-semibold ${
                          INVOICE_STATUS_STYLES[effectiveStatus] ?? "bg-border-subtle/40 text-gray-text"
                        }`}
                      >
                        {INVOICE_STATUS_LABELS[effectiveStatus] ?? effectiveStatus}
                      </span>
                    </div>
                    <div className="text-sm text-gray-text">
                      {INVOICE_TYPE_LABELS[invoice.invoiceType] ?? invoice.invoiceType} · {formatPrice(invoice.totalHt)} ·
                      échéance {new Date(invoice.dueDate).toLocaleDateString("fr-FR")}
                    </div>
                    {invoice.isFinalized && (
                      <a
                        href={`${window.location.origin}/facture/${invoice.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-brand-mid hover:underline"
                      >
                        Lien public ↗
                      </a>
                    )}
                    <div className="mt-1 flex flex-wrap gap-3 text-sm">
                      {!invoice.isFinalized && (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(invoice.id)}
                            className="font-medium text-brand-mid hover:text-brand-start"
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFinalize(invoice.id)}
                            className="font-medium text-brand-mid hover:text-brand-start"
                          >
                            Finaliser
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(invoice.id)}
                            className="font-medium text-red-500 hover:text-red-600"
                          >
                            Supprimer
                          </button>
                        </>
                      )}
                      {invoice.isFinalized && invoice.status !== "paid" && invoice.status !== "cancelled" && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleMarkPaid(invoice.id)}
                            className="font-medium text-green-accent hover:opacity-80"
                          >
                            Marquer payée
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancel(invoice.id)}
                            className="font-medium text-red-500 hover:text-red-600"
                          >
                            Annuler
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDownloadPdf(invoice)}
                        disabled={downloadingId === invoice.id}
                        className="font-medium text-gray-text hover:text-navy disabled:opacity-40"
                      >
                        {downloadingId === invoice.id ? "Téléchargement…" : "Télécharger PDF"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-card bg-white p-6 shadow-card">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.05em] text-gray-text">
            {editingId ? "Modifier la facture" : "Créer une facture"}
          </h3>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <select
              className={inputClass}
              value={form.billingClientId}
              onChange={(e) => setForm({ ...form, billingClientId: e.target.value })}
              required
            >
              <option value="" disabled>
                — Choisir un client —
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              className={inputClass}
              value={form.invoiceType}
              onChange={(e) => setForm({ ...form, invoiceType: e.target.value })}
            >
              {INVOICE_TYPE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>

            <div className="flex flex-col gap-2">
              {form.lines.map((line, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className={`${inputClass} flex-1`}
                    placeholder="Désignation"
                    value={line.label}
                    onChange={(e) => updateLine(i, { label: e.target.value })}
                    required
                  />
                  <input
                    className={`${inputClass} w-16`}
                    type="number"
                    min="0"
                    step="0.5"
                    value={line.quantity}
                    onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })}
                  />
                  <input
                    className={`${inputClass} w-24`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.unitPrice}
                    onChange={(e) => updateLine(i, { unitPrice: Number(e.target.value) })}
                  />
                  {form.lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(i)}
                      className="shrink-0 text-lg leading-none text-gray-text hover:text-red-500"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={addLine} className="text-sm font-medium text-brand-mid hover:text-brand-start">
                  + Ajouter une ligne
                </button>
                <TariffPicker password={password} onPick={pickLine} />
              </div>
            </div>

            <div className="text-right text-sm font-semibold text-navy">Total HT : {formatPrice(total)}</div>

            <textarea
              className={inputClass}
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!form.billingClientId}
                className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {editingId ? "Enregistrer" : "Créer la facture (brouillon)"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-button border border-border-subtle px-4 py-2.5 font-semibold text-gray-text hover:bg-bg-page-start"
                >
                  Annuler
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

type StripeAgencySettings = { secretKey: string; webhookSecret: string };

const stripeInputClass =
  "rounded-button border border-border-subtle bg-white px-3 py-2 font-mono text-sm text-navy placeholder:font-sans placeholder:text-gray-text/60 focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20";

function StripePaymentPanel({ password }: { password: string }) {
  const [settings, setSettings] = useState<StripeAgencySettings | null>(null);
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    adminFetch(API_BASE_URL, "/api/admin/stripe-settings", password)
      .then((res) => res.json())
      .then((data: StripeAgencySettings) => {
        setSettings(data);
        setSecretKey(data.secretKey);
        setWebhookSecret(data.webhookSecret);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDirty = Boolean(settings && (secretKey !== settings.secretKey || webhookSecret !== settings.webhookSecret));

  const handleSave = async () => {
    setSaveStatus("saving");
    const res = await adminFetch(API_BASE_URL, "/api/admin/stripe-settings", password, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secretKey, webhookSecret }),
    });
    if (res.ok) {
      setSettings(await res.json());
      setSaveStatus("saved");
    } else {
      setSaveStatus("error");
    }
  };

  if (!settings) return <p className="text-gray-text">Chargement…</p>;

  const webhookUrl = `${API_BASE_URL}/api/public/invoices/stripe-webhook`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">Paiement</h1>
          <p className="text-sm text-gray-text">Permet à tes clients de payer une facture en ligne, par carte.</p>
        </div>
        <div className="flex items-center gap-3">
          {saveStatus === "saved" && <span className="text-sm text-green-accent">Enregistré</span>}
          {saveStatus === "error" && <span className="text-sm text-red-500">Erreur lors de l'enregistrement.</span>}
          <button
            type="button"
            onClick={handleSave}
            disabled={saveStatus === "saving" || !isDirty}
            className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saveStatus === "saving" ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>

      <section className="flex flex-col gap-5 rounded-card bg-white p-8 shadow-card">
        <p className="text-sm text-gray-text">
          C'est <strong>ton</strong> compte Stripe (celui de l'agence) — l'argent encaissé sur tes factures arrive
          directement dessus. Crée un compte sur{" "}
          <a href="https://dashboard.stripe.com/register" target="_blank" rel="noreferrer" className="font-medium text-brand-mid underline">
            stripe.com
          </a>{" "}
          si ce n'est pas déjà fait, puis récupère les informations ci-dessous depuis ton tableau de bord. Commence
          en mode test (clés <span className="font-mono">sk_test_…</span>) pour essayer sans encaisser réellement.
        </p>

        <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
          Clé secrète (Développeurs → Clés API)
          <input
            className={stripeInputClass}
            type="password"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            placeholder="sk_live_… ou sk_test_…"
            autoComplete="off"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
          Secret de signature du webhook
          <input
            className={stripeInputClass}
            type="password"
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            placeholder="whsec_…"
            autoComplete="off"
          />
        </label>

        <div className="flex flex-col gap-1 text-sm font-medium text-gray-text">
          URL du webhook à créer côté Stripe (Développeurs → Webhooks → Ajouter un endpoint, événement
          à écouter : <span className="font-mono text-navy">checkout.session.completed</span>)
          <input readOnly className={`${stripeInputClass} text-gray-text`} value={webhookUrl} onFocus={(e) => e.target.select()} />
        </div>
      </section>
    </div>
  );
}

type EmailSettings = { brevoApiKey: string };

function EmailConfirmationPanel({ password }: { password: string }) {
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [brevoApiKey, setBrevoApiKey] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    adminFetch(API_BASE_URL, "/api/admin/email-settings", password)
      .then((res) => res.json())
      .then((data: EmailSettings) => {
        setSettings(data);
        setBrevoApiKey(data.brevoApiKey);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDirty = Boolean(settings && brevoApiKey !== settings.brevoApiKey);

  const handleSave = async () => {
    setSaveStatus("saving");
    const res = await adminFetch(API_BASE_URL, "/api/admin/email-settings", password, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brevoApiKey }),
    });
    if (res.ok) {
      setSettings(await res.json());
      setSaveStatus("saved");
    } else {
      setSaveStatus("error");
    }
  };

  if (!settings) return <p className="text-gray-text">Chargement…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">Email de confirmation</h1>
          <p className="text-sm text-gray-text">
            Envoyé automatiquement au client dès qu'une facture est payée en ligne (Stripe), avec la facture en
            pièce jointe.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveStatus === "saved" && <span className="text-sm text-green-accent">Enregistré</span>}
          {saveStatus === "error" && <span className="text-sm text-red-500">Erreur lors de l'enregistrement.</span>}
          <button
            type="button"
            onClick={handleSave}
            disabled={saveStatus === "saving" || !isDirty}
            className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saveStatus === "saving" ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>

      <section className="flex flex-col gap-5 rounded-card bg-white p-8 shadow-card">
        <p className="text-sm text-gray-text">
          Envoyé via ton compte{" "}
          <a href="https://app.brevo.com/settings/keys/api" target="_blank" rel="noreferrer" className="font-medium text-brand-mid underline">
            Brevo
          </a>
          , depuis l'adresse configurée dans l'onglet Entreprise. Vérifie que cette adresse est bien validée côté
          Brevo (Expéditeurs, Domaines) avant d'activer — sinon les emails partiront en échec silencieux.
        </p>

        <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
          Clé API Brevo
          <input
            className={stripeInputClass}
            type="password"
            value={brevoApiKey}
            onChange={(e) => setBrevoApiKey(e.target.value)}
            placeholder="xkeysib-…"
            autoComplete="off"
          />
        </label>
      </section>
    </div>
  );
}

export default function AgencyBillingPage() {
  const { password, login } = useAdminSession("agency");
  const [activeTab, setActiveTab] = useState<TabId>("entreprise");

  if (!password) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-10">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-soft">
            <IconInvoice className="h-6 w-6" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-lg font-extrabold text-navy">etnof-web</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-green-accent">Agence</span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-3xl font-extrabold text-navy">Facturation & devis</h1>
          <p className="max-w-sm text-sm text-gray-text">Espace réservé à l'agence.</p>
        </div>
        <AdminLoginForm loginPath="/api/admin/login" onLoggedIn={login} />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-pill bg-white px-6 py-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-soft">
              <IconInvoice className="h-6 w-6" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-extrabold text-navy">etnof-web</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-green-accent">Agence</span>
            </div>
          </div>
          <a href="/admin/dashboard" className="text-sm font-medium text-gray-text hover:text-navy">
            ← Vue globale
          </a>
        </header>

        {TABS.length > 1 && (
          <div className="flex gap-2 border-b border-border-subtle">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === tab.id
                    ? "border-brand-mid text-navy"
                    : "border-transparent text-gray-text hover:text-navy"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {activeTab === "entreprise" && <CompanyProfilePanel password={password} />}
        {activeTab === "clients" && <BillingClientsPanel password={password} />}
        {activeTab === "formules" && <PackageOffersPanel password={password} />}
        {activeTab === "devis" && <QuotesPanel password={password} />}
        {activeTab === "factures" && <InvoicesPanel password={password} />}
        {activeTab === "paiement" && (
          <div className="flex flex-col gap-10">
            <StripePaymentPanel password={password} />
            <div className="border-t border-border-subtle pt-10">
              <EmailConfirmationPanel password={password} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
