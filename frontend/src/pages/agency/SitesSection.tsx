import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import { adminFetch } from "../../hooks/useAdminSession";
import { TEMPLATES } from "../../templates/registry";
import type { TemplateId } from "../../hooks/useTemplate";
import { inputClass, type ModuleMeta } from "./shared";
import { IconExternalLink } from "../../components/admin/icons";
import ModuleThumbnail from "../../components/admin/ModuleThumbnail";

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

export default function SitesSection({ password }: { password: string }) {
  const [sites, setSites] = useState<ClientSite[] | null>(null);
  const [availableModules, setAvailableModules] = useState<ModuleMeta[]>([]);
  const [modal, setModal] = useState<"create" | ClientSite | null>(null);

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
    load();
  };

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
                <div className="mt-1 flex gap-3 text-sm">
                  <button
                    type="button"
                    onClick={() => setModal(site)}
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

      {modal && (
        <SiteFormModal
          password={password}
          availableModules={availableModules}
          editing={modal === "create" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
