import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";
import { useAdminSession, adminFetch } from "../hooks/useAdminSession";
import AdminLoginForm from "../components/AdminLoginForm";
import StatTile from "../components/charts/StatTile";
import HorizontalBarChart from "../components/charts/HorizontalBarChart";
import { IconDashboard, IconOffers, IconCustomers } from "../components/admin/icons";
import { TEMPLATES } from "../templates/registry";
import type { TemplateId } from "../hooks/useTemplate";

const STATUSES = ["En cours", "Livré", "En maintenance"];

// Couleur par statut — reprise pour le pill du statut et le tone des stat tiles, voir
// docs/09-charte-graphique.md (vert = accent positif, bleu = brand, ambre = attention).
const STATUS_STYLES: Record<string, string> = {
  "Livré": "bg-green-accent/10 text-green-accent",
  "En cours": "bg-brand-mid/10 text-brand-mid",
  "En maintenance": "bg-amber-100 text-amber-700",
};

function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient text-sm font-black text-white shadow-soft">
        ENW
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-lg font-extrabold text-navy">etnof-web</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-green-accent">
          Agence
        </span>
      </div>
    </div>
  );
}

type IconComponent = typeof IconDashboard;

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: IconComponent;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-button bg-brand-mid/10 text-brand-mid">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-navy">{title}</h2>
        {description && <p className="text-sm text-gray-text">{description}</p>}
      </div>
    </div>
  );
}

type ModuleMeta = { name: string; displayName: string; price: string };

type ClientSite = {
  id: string;
  name: string;
  siteType: string;
  description: string;
  url: string;
  status: string;
  modules: string[];
  templateId: TemplateId;
  createdAt: string;
};

function tenantSiteUrl(clientSiteId: string) {
  return `${window.location.origin}/t/${clientSiteId}`;
}

function tenantAdminUrl(clientSiteId: string) {
  return `${window.location.origin}/admin/${clientSiteId}`;
}

type Stats = {
  totalSites: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byModule: Record<string, number>;
};

const inputClass =
  "rounded-button border border-border-subtle bg-white px-3 py-2 text-navy placeholder:text-gray-text/60 focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20";

const emptyForm = {
  name: "",
  siteType: "",
  description: "",
  url: "",
  status: STATUSES[0],
  modules: [] as string[],
  password: "",
  templateId: TEMPLATES[0].id as TemplateId,
};

function StatsPanel({ password }: { password: string }) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    adminFetch(API_BASE_URL, "/api/admin/stats", password)
      .then((res) => res.json())
      .then(setStats);
  }, [password]);

  if (!stats)
    return (
      <div className="rounded-card bg-white p-6 text-sm text-gray-text shadow-card">
        Chargement des statistiques…
      </div>
    );

  const toBars = (record: Record<string, number>) =>
    Object.entries(record).map(([label, value]) => ({ label, value }));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Sites au total" value={stats.totalSites} />
        <StatTile label="Livrés" value={stats.byStatus["Livré"] ?? 0} tone="green" />
        <StatTile label="En cours" value={stats.byStatus["En cours"] ?? 0} tone="blue" />
        <StatTile label="En maintenance" value={stats.byStatus["En maintenance"] ?? 0} tone="amber" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <HorizontalBarChart title="Modules utilisés" data={toBars(stats.byModule)} />
        <HorizontalBarChart title="Types de site" data={toBars(stats.byType)} />
      </div>
    </div>
  );
}

// Ne garde que les chiffres — le prix est toujours affiché en euros (ModulesSection.tsx applique
// la même règle côté admin client), pas la peine de laisser Ethan taper "€"/"EUR" lui-même.
const onlyDigits = (value: string) => value.replace(/[^0-9]/g, "");

// Prix affiché sur la card d'un module non autorisé côté admin client ("Activer pour {price}") —
// voir ModulesSection.tsx. Global au socle, pas par client.
function ModulePricingPanel({ password }: { password: string }) {
  const [modules, setModules] = useState<ModuleMeta[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savedName, setSavedName] = useState<string | null>(null);

  const load = () =>
    adminFetch(API_BASE_URL, "/api/admin/modules", password)
      .then((res) => res.json())
      .then((data: ModuleMeta[]) => {
        setModules(data);
        setDrafts(Object.fromEntries(data.map((m) => [m.name, onlyDigits(m.price)])));
      });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (name: string) => {
    await adminFetch(API_BASE_URL, `/api/admin/modules/${name}/price`, password, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price: drafts[name] ?? "" }),
    });
    setSavedName(name);
    setTimeout(() => setSavedName((current) => (current === name ? null : current)), 1500);
  };

  if (!modules) return null;

  return (
    <section className="rounded-card bg-white p-6 shadow-card">
      <div className="flex flex-col gap-3">
        {modules.map((m) => (
          <div key={m.name} className="flex items-center gap-3">
            <span className="w-40 shrink-0 text-sm font-medium text-navy">{m.displayName}</span>
            <div className="relative">
              <input
                className={`${inputClass} pr-7`}
                placeholder="ex : 250"
                inputMode="numeric"
                value={drafts[m.name] ?? ""}
                onChange={(e) => setDrafts({ ...drafts, [m.name]: onlyDigits(e.target.value) })}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-gray-text/60">€</span>
            </div>
            <button
              type="button"
              onClick={() => handleSave(m.name)}
              disabled={(drafts[m.name] ?? "") === onlyDigits(m.price)}
              className="shrink-0 rounded-button border border-border-subtle px-3 py-2 text-sm font-medium text-gray-text transition-opacity hover:bg-bg-page-start disabled:cursor-not-allowed disabled:opacity-40"
            >
              Enregistrer
            </button>
            {savedName === m.name && <span className="shrink-0 text-sm text-green-accent">Enregistré</span>}
          </div>
        ))}
      </div>
    </section>
  );
}

function ClientSitesPanel({ password }: { password: string }) {
  const [sites, setSites] = useState<ClientSite[] | null>(null);
  const [availableModules, setAvailableModules] = useState<ModuleMeta[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [originalForm, setOriginalForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = () =>
    adminFetch(API_BASE_URL, "/api/admin/client-sites", password)
      .then((res) => res.json())
      .then(setSites);

  useEffect(() => {
    load();
    adminFetch(API_BASE_URL, "/api/admin/modules", password)
      .then((res) => res.json())
      .then(setAvailableModules);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleModule = (name: string) =>
    setForm((f) => ({
      ...f,
      modules: f.modules.includes(name) ? f.modules.filter((m) => m !== name) : [...f.modules, name],
    }));

  const startEdit = (site: ClientSite) => {
    setEditingId(site.id);
    const next = {
      name: site.name,
      siteType: site.siteType,
      description: site.description,
      url: site.url,
      status: site.status,
      modules: site.modules,
      password: "",
      templateId: site.templateId,
    };
    setForm(next);
    setOriginalForm(next);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOriginalForm(emptyForm);
  };

  // Hors édition ("Ajouter"), le bouton reste actif (gated par les `required` HTML natifs) — la
  // détection de modification ne s'applique qu'en mode "Enregistrer" (édition d'un site existant).
  const isDirty = editingId ? JSON.stringify(form) !== JSON.stringify(originalForm) : true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = editingId ? `/api/admin/client-sites/${editingId}` : "/api/admin/client-sites";
    await adminFetch(API_BASE_URL, path, password, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    cancelEdit();
    load();
  };

  const handleDelete = async (id: string) => {
    await adminFetch(API_BASE_URL, `/api/admin/client-sites/${id}`, password, { method: "DELETE" });
    load();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <section className="rounded-card bg-white p-6 shadow-card">
        {!sites ? (
          <p className="text-gray-text">Chargement…</p>
        ) : sites.length === 0 ? (
          <p className="text-sm text-gray-text">Aucun site enregistré pour l'instant.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {sites.map((site) => (
              <li
                key={site.id}
                className="flex flex-col gap-1 rounded-button bg-bg-page-start/60 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-navy">{site.name}</span>
                  <span
                    className={`shrink-0 rounded-pill px-2.5 py-1 text-xs font-semibold ${
                      STATUS_STYLES[site.status] ?? "bg-border-subtle/40 text-gray-text"
                    }`}
                  >
                    {site.status}
                  </span>
                </div>
                <div className="text-sm text-gray-text">
                  {site.siteType || "Type non renseigné"} · template {site.templateId}
                  {site.modules.length > 0 && ` · ${site.modules.join(", ")}`}
                </div>
                {site.url && (
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-brand-mid hover:underline"
                  >
                    {site.url}
                  </a>
                )}
                <div className="flex flex-wrap gap-3 text-sm">
                  <a
                    href={tenantSiteUrl(site.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-gray-text hover:text-navy"
                  >
                    Site (aperçu) ↗
                  </a>
                  <a
                    href={tenantAdminUrl(site.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-gray-text hover:text-navy"
                  >
                    Admin du client ↗
                  </a>
                </div>
                <div className="mt-1 flex gap-3 text-sm">
                  <button
                    type="button"
                    onClick={() => startEdit(site)}
                    className="font-medium text-brand-mid hover:text-brand-start"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(site.id)}
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
          {editingId ? "Modifier le site" : "Ajouter un site"}
        </h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            className={inputClass}
            placeholder="Nom du client"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            className={inputClass}
            placeholder="Type de site (ex : Boulangerie)"
            value={form.siteType}
            onChange={(e) => setForm({ ...form, siteType: e.target.value })}
          />
          <textarea
            className={inputClass}
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <input
            className={inputClass}
            placeholder="URL du site déployé"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
          />
          <select
            className={inputClass}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <input
            type="password"
            className={inputClass}
            placeholder={editingId ? "Nouveau mot de passe (laisser vide pour ne pas changer)" : "Mot de passe du client"}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required={!editingId}
          />

          <select
            className={inputClass}
            value={form.templateId}
            onChange={(e) => setForm({ ...form, templateId: e.target.value as TemplateId })}
          >
            {TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>

          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1 text-sm font-medium text-gray-text">
              Modules autorisés (le client peut ensuite les masquer, pas les activer lui-même)
            </legend>
            {availableModules.map((m) => (
              <label key={m.name} className="flex items-center gap-2 text-sm text-navy">
                <input
                  type="checkbox"
                  checked={form.modules.includes(m.name)}
                  onChange={() => toggleModule(m.name)}
                  className="h-4 w-4 accent-brand-mid"
                />
                {m.displayName}
              </label>
            ))}
          </fieldset>

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
  );
}

export default function AgencyDashboardPage() {
  const { password, login } = useAdminSession("agency");

  if (!password) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-10">
        <BrandMark />
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-green-accent">
            Espace réservé
          </span>
          <h1 className="text-3xl font-extrabold text-navy">Vue globale — mes sites clients</h1>
          <p className="max-w-sm text-sm text-gray-text">
            Suivi des projets livrés, des modules actifs et des tarifs — réservé à l'agence.
          </p>
        </div>
        <AdminLoginForm loginPath="/api/admin/login" onLoggedIn={login} />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-12 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-pill bg-white px-6 py-4 shadow-soft">
          <BrandMark />
          <div className="flex items-center gap-4">
            <a
              href="/admin/dashboard/facturation"
              className="rounded-button border border-border-subtle px-3 py-2 text-sm font-medium text-gray-text hover:bg-bg-page-start hover:text-navy"
            >
              Facturation & devis →
            </a>
            <div className="text-right">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-green-accent">
                Vue globale
              </span>
              <h1 className="text-lg font-extrabold text-navy">Mes sites clients</h1>
            </div>
          </div>
        </header>

        <section>
          <SectionHeader
            icon={IconDashboard}
            title="Vue d'ensemble"
            description="Statistiques agrégées sur l'ensemble de vos projets clients."
          />
          <StatsPanel password={password} />
        </section>

        <section className="border-t border-border-subtle pt-12">
          <SectionHeader
            icon={IconOffers}
            title="Tarifs des modules"
            description={
              'Affiché aux clients sur la card d\'un module qu\'ils n\'ont pas encore ("Activer pour {prix} €"). Laisser vide pour ne pas afficher de prix — toujours en euros.'
            }
          />
          <ModulePricingPanel password={password} />
        </section>

        <section className="border-t border-border-subtle pt-12">
          <SectionHeader
            icon={IconCustomers}
            title="Sites clients"
            description="Ajoutez un client au moment de la livraison et suivez le statut de chaque projet."
          />
          <ClientSitesPanel password={password} />
        </section>
      </div>
    </div>
  );
}
