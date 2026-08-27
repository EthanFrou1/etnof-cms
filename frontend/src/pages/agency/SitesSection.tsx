import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import { adminFetch } from "../../hooks/useAdminSession";
import { TEMPLATES, resolvePalette } from "../../templates/registry";
import type { TemplateId } from "../../hooks/useTemplate";
import { inputClass, type ModuleMeta } from "./shared";
import { IconExternalLink } from "../../components/admin/icons";
import ModuleThumbnail from "../../components/admin/ModuleThumbnail";
import Select from "../../components/admin/Select";
import ConfirmModal from "../../components/admin/ConfirmModal";

const STATUSES = ["En cours", "Livré", "En maintenance"];

// Couleur par statut — reprise pour le pill du statut, voir docs/09-charte-graphique.md (vert =
// accent positif, bleu = brand, ambre = attention).
const STATUS_STYLES: Record<string, string> = {
  "Livré": "bg-green-accent/10 text-green-accent",
  "En cours": "bg-brand-mid/10 text-brand-mid",
  "En maintenance": "bg-amber-100 text-amber-700",
};

type ClientSite = {
  id: string;
  name: string;
  siteType: string;
  description: string;
  url: string;
  status: string;
  modules: string[];
  templateId: TemplateId;
  paletteId: string;
  createdAt: string;
};

function tenantSiteUrl(clientSiteId: string) {
  return `${window.location.origin}/t/${clientSiteId}`;
}

function tenantAdminUrl(clientSiteId: string) {
  return `${window.location.origin}/admin/${clientSiteId}`;
}

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

function formFromSite(site: ClientSite) {
  return {
    name: site.name,
    siteType: site.siteType,
    description: site.description,
    url: site.url,
    status: site.status,
    modules: site.modules,
    password: "",
    templateId: site.templateId,
  };
}

// Modal unique pour créer ou modifier un site — le bouton de soumission ne devient cliquable
// qu'une fois le nom (et, en création, le mot de passe) renseignés : voir `missingRequired`.
function SiteFormModal({
  password,
  availableModules,
  editing,
  onClose,
  onSaved,
}: {
  password: string;
  availableModules: ModuleMeta[];
  editing: ClientSite | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(editing ? formFromSite(editing) : emptyForm);
  const [saving, setSaving] = useState(false);

  const toggleModule = (name: string) =>
    setForm((f) => ({
      ...f,
      modules: f.modules.includes(name) ? f.modules.filter((m) => m !== name) : [...f.modules, name],
    }));

  // Infos nécessaires à la création d'un site : nom du client + mot de passe. En édition, le mot
  // de passe reste optionnel (vide = inchangé), seul le nom est requis.
  const missingRequired = !form.name.trim() || (!editing && !form.password.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const path = editing ? `/api/admin/client-sites/${editing.id}` : "/api/admin/client-sites";
    await adminFetch(API_BASE_URL, path, password, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
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
          <h2 className="text-lg font-bold text-navy">{editing ? "Modifier le site" : "Ajouter un site"}</h2>
          <button type="button" onClick={onClose} className="text-xl leading-none text-gray-text hover:text-navy">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
            Nom du client
            <input
              className={inputClass}
              placeholder="Nom du client"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
            Type de site
            <input
              className={inputClass}
              placeholder="ex : Boulangerie"
              value={form.siteType}
              onChange={(e) => setForm({ ...form, siteType: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
            Description
            <textarea
              className={inputClass}
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
            URL du site déployé
            <input
              className={inputClass}
              placeholder="https://…"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
            Statut
            <Select
              className={inputClass}
              value={form.status}
              onChange={(status) => setForm({ ...form, status })}
              options={STATUSES.map((s) => ({ value: s, label: s }))}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
            Mot de passe
            <input
              type="password"
              className={inputClass}
              placeholder={editing ? "Laisser vide pour ne pas changer" : "Mot de passe du client"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required={!editing}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
            Template
            <Select
              className={inputClass}
              value={form.templateId}
              onChange={(templateId) => setForm({ ...form, templateId: templateId as TemplateId })}
              options={TEMPLATES.map((t) => ({ value: t.id, label: t.label }))}
            />
          </label>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium text-gray-text">
              Modules autorisés (le client peut ensuite les masquer, pas les activer lui-même)
            </legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {availableModules.map((m) => {
                const checked = form.modules.includes(m.name);
                return (
                  <label
                    key={m.name}
                    className={`flex cursor-pointer items-center gap-2 rounded-button border p-2 text-sm transition-colors ${
                      checked
                        ? "border-brand-mid bg-brand-mid/5 text-navy"
                        : "border-border-subtle text-gray-text hover:bg-bg-page-start"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleModule(m.name)}
                      className="sr-only"
                    />
                    <ModuleThumbnail name={m.name} displayName={m.displayName} className="h-9 w-9" />
                    <span className="font-medium">{m.displayName}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={missingRequired || saving}
              className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Enregistrement…" : editing ? "Enregistrer" : "Créer le site"}
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

const templateLabel = (id: TemplateId) => TEMPLATES.find((t) => t.id === id)?.label ?? id;

export default function SitesSection({ password }: { password: string }) {
  const [sites, setSites] = useState<ClientSite[] | null>(null);
  const [availableModules, setAvailableModules] = useState<ModuleMeta[]>([]);
  const [modal, setModal] = useState<"create" | ClientSite | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [templateFilter, setTemplateFilter] = useState("");
  const [siteToDelete, setSiteToDelete] = useState<ClientSite | null>(null);

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

  const handleDelete = async (id: string) => {
    await adminFetch(API_BASE_URL, `/api/admin/client-sites/${id}`, password, { method: "DELETE" });
    setSiteToDelete(null);
    load();
  };

  const filteredSites =
    sites?.filter((site) => {
      if (search.trim() && !site.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      if (statusFilter && site.status !== statusFilter) return false;
      if (templateFilter && site.templateId !== templateFilter) return false;
      return true;
    }) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">Sites clients</h1>
          <p className="text-sm text-gray-text">
            Ajoutez un client au moment de la livraison et suivez le statut de chaque projet.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal("create")}
          className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white hover:opacity-90"
        >
          + Ajouter un site
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          className={`${inputClass} w-full sm:w-56`}
          placeholder="Rechercher un client…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setStatusFilter("")}
            className={`rounded-pill px-3 py-1.5 text-xs font-semibold transition-colors ${
              statusFilter === "" ? "bg-navy text-white" : "bg-border-subtle/40 text-gray-text hover:bg-border-subtle/70"
            }`}
          >
            Tous
          </button>
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter((current) => (current === s ? "" : s))}
              className={`rounded-pill px-3 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === s ? STATUS_STYLES[s] ?? "bg-navy text-white" : "bg-border-subtle/40 text-gray-text hover:bg-border-subtle/70"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="w-52 shrink-0">
          <Select
            className={inputClass}
            value={templateFilter}
            onChange={setTemplateFilter}
            options={[{ value: "", label: "Tous les templates" }, ...TEMPLATES.map((t) => ({ value: t.id, label: t.label }))]}
          />
        </div>
      </div>

      {!filteredSites ? (
        <p className="text-gray-text">Chargement…</p>
      ) : filteredSites.length === 0 ? (
        <section className="rounded-card bg-white p-8 shadow-card">
          <p className="text-sm text-gray-text">
            {sites && sites.length > 0 ? "Aucun site ne correspond à ces filtres." : "Aucun site enregistré pour l'instant."}
          </p>
        </section>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredSites.map((site) => {
            const accent = resolvePalette(site.templateId, site.paletteId).accent;
            return (
              <article key={site.id} className="flex flex-col overflow-hidden rounded-card bg-white shadow-card">
                <div className="h-2" style={{ backgroundColor: accent }} />
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="font-bold text-navy">{site.name}</h2>
                      <p className="text-xs text-gray-text">{site.siteType || "Type non renseigné"}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-pill px-2.5 py-1 text-xs font-semibold ${
                        STATUS_STYLES[site.status] ?? "bg-border-subtle/40 text-gray-text"
                      }`}
                    >
                      {site.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-medium text-gray-text">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
                    Template {templateLabel(site.templateId)}
                  </div>

                  {site.modules.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {site.modules.map((m) => (
                        <span key={m} className="rounded-pill bg-bg-page-start px-2 py-0.5 text-[11px] font-medium text-gray-text">
                          {m}
                        </span>
                      ))}
                    </div>
                  )}

                  {site.url && (
                    <a href={site.url} target="_blank" rel="noreferrer" className="truncate text-sm text-brand-mid hover:underline">
                      {site.url}
                    </a>
                  )}

                  <div className="mt-auto flex flex-col gap-3 pt-2">
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={tenantSiteUrl(site.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 rounded-button border border-border-subtle bg-white px-3 py-1.5 text-xs font-medium text-gray-text hover:bg-bg-page-start hover:text-navy"
                      >
                        <IconExternalLink className="h-3.5 w-3.5" />
                        Site (aperçu)
                      </a>
                      <a
                        href={tenantAdminUrl(site.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 rounded-button border border-border-subtle bg-white px-3 py-1.5 text-xs font-medium text-gray-text hover:bg-bg-page-start hover:text-navy"
                      >
                        <IconExternalLink className="h-3.5 w-3.5" />
                        Admin du client
                      </a>
                    </div>
                    <div className="flex gap-3 text-sm">
                      <button
                        type="button"
                        onClick={() => setModal(site)}
                        className="font-medium text-brand-mid hover:text-brand-start"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => setSiteToDelete(site)}
                        className="font-medium text-red-500 hover:text-red-600"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {modal && (
        <SiteFormModal
          password={password}
          availableModules={availableModules}
          editing={modal === "create" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}

      {siteToDelete && (
        <ConfirmModal
          title={`Supprimer le site "${siteToDelete.name}" ?`}
          message="Action définitive et irréversible : le site du client, son contenu, ses produits/commandes et ses messages seront tous supprimés."
          onConfirm={() => handleDelete(siteToDelete.id)}
          onCancel={() => setSiteToDelete(null)}
        />
      )}
    </div>
  );
}
