import { useEffect, useState } from "react";
import { API_BASE_URL, AGENCY_CONTACT_EMAIL } from "../../config";
import type { ModuleConfig, ModulesConfig } from "../../hooks/useModules";
import { adminFetch } from "../../hooks/useAdminSession";

type ModulesSectionProps = {
  clientSiteId: string;
  password: string;
};

// Une image par module, générée par IA et déposée par Ethan dans frontend/public/module-icons/
// (voir docs/11-images-modules.md). Tant qu'un fichier n'existe pas, la card retombe sur un
// dégradé de marque avec l'initiale du module — jamais d'image cassée.
const MODULE_IMAGES: Record<string, string> = {
  contact: "/module-icons/contact.png",
  maps: "/module-icons/maps.png",
  blog: "/module-icons/blog.png",
  catalogue: "/module-icons/catalogue.png",
  horaires: "/module-icons/horaires.png",
  rdv: "/module-icons/rdv.png",
  newsletter: "/module-icons/newsletter.png",
  "avis-google": "/module-icons/avis-google.png",
  whatsapp: "/module-icons/whatsapp.png",
  stripe: "/module-icons/stripe.png",
  multilingue: "/module-icons/multilingue.png",
};

// Prix stocké en texte libre par Ethan (voir PricingSection.tsx, espace agence) — parfois
// avec "EUR" ou "€" déjà tapé, parfois juste un nombre. On n'affiche jamais cette valeur brute : on
// n'en garde que les chiffres et on ajoute systématiquement "€", pour que l'unité soit toujours la
// même quelle que soit la façon dont le prix a été saisi.
function formatPriceEur(rawPrice: string): string {
  const digits = rawPrice.replace(/[^0-9]/g, "");
  return digits ? `${digits} €` : "";
}

type ModuleField = { key: string; label: string; placeholder?: string };

// Modules qui ont besoin d'informations en plus du simple on/off — voir XSection.config.ts de
// chaque module (ex. modules/maps/frontend/MapsSection.config.ts). Ajouter une entrée ici suffit
// pour qu'un nouveau champ apparaisse sur la card ET soit inclus dans l'enregistrement groupé.
const MODULE_FIELDS: Record<string, ModuleField[]> = {
  // "address" a déménagé sur la page Établissement (partagée entre modules) — Maps lit
  // désormais content.address, voir TemplateHestia.tsx/TemplateHelios.tsx.
  maps: [{ key: "apiKey", label: "Clé Google Maps API", placeholder: "AIza…" }],
  whatsapp: [
    { key: "phoneNumber", label: "Numéro WhatsApp", placeholder: "+33 6 12 34 56 78" },
    { key: "message", label: "Message pré-rempli", placeholder: "Bonjour, je vous contacte depuis votre site." },
  ],
};

function activationMailto(clientSiteId: string, displayName: string, price: string) {
  const subject = `Activation du module ${displayName}`;
  const body = [
    "Bonjour,",
    "",
    `Je souhaite activer le module "${displayName}"${price ? ` (${price})` : ""} sur mon site.`,
    `Identifiant du site : ${clientSiteId}`,
    "",
    "Merci !",
  ].join("\n");
  return `mailto:${AGENCY_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function ToggleSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className={`relative inline-flex items-center ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="h-6 w-11 rounded-full bg-border-subtle transition-colors duration-200 peer-checked:bg-green-accent peer-disabled:opacity-40" />
      <div className="absolute left-1 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 peer-checked:translate-x-5" />
    </label>
  );
}

const fieldInputClass =
  "rounded-button border border-border-subtle px-2.5 py-1.5 text-sm text-navy placeholder:text-gray-text/50 focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20";

function ModuleCard({
  clientSiteId,
  name,
  config,
  fields,
  values,
  onFieldChange,
  onToggle,
}: {
  clientSiteId: string;
  name: string;
  config: ModuleConfig;
  fields?: ModuleField[];
  values: Record<string, string>;
  onFieldChange: (key: string, value: string) => void;
  onToggle: (name: string, enabled: boolean) => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  const authorized = config.authorized !== false;
  const enabled = Boolean(config.enabled);
  const displayName = typeof config.displayName === "string" ? config.displayName : name;
  const description = typeof config.description === "string" ? config.description : "";
  const price = formatPriceEur(typeof config.price === "string" ? config.price : "");
  const imageSrc = MODULE_IMAGES[name];

  const statusBadgeClass = enabled ? "bg-green-accent/90 text-white" : "bg-white/80 text-gray-text";

  return (
    <div className="group overflow-hidden rounded-card bg-white shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-soft">
      <div className="relative aspect-[16/10] overflow-hidden bg-brand-gradient">
        {imageSrc && !imgFailed ? (
          <img
            src={imageSrc}
            alt=""
            onError={() => setImgFailed(true)}
            className={`h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 ${
              authorized ? "" : "grayscale"
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl font-black text-white/30">
            {displayName.charAt(0)}
          </div>
        )}
        <div className={`absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/10 to-transparent ${authorized ? "" : "bg-navy/20"}`} />

        {/* Wording d'aide : recouvre l'image et s'affiche au survol de toute la card, plutôt
            qu'une bulle déclenchée par un badge dédié. Seulement pour les modules autorisés : sur
            les non autorisés le CTA "Activer pour {prix}" occupe déjà le centre de la card en
            permanence, les deux se chevauchaient (texte illisible derrière/autour du bouton). */}
        {description && authorized && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-navy/90 p-6 text-center text-sm leading-relaxed text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            {description}
          </div>
        )}

        {authorized ? (
          <span className={`absolute left-3 top-3 rounded-pill px-2.5 py-1 text-[11px] font-semibold ${statusBadgeClass}`}>
            {enabled ? "Activé" : "Désactivé"}
          </span>
        ) : (
          <div className="pointer-events-none absolute -right-11 top-5 w-40 rotate-45 bg-navy py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-white shadow-soft">
            Non disponible
          </div>
        )}

        {/* Toggle à la place du badge "?" — plus besoin d'un bouton d'aide séparé puisque
            survoler la card entière révèle déjà la description. */}
        {authorized && (
          <div className="absolute right-3 top-3">
            <ToggleSwitch checked={enabled} disabled={false} onChange={(value) => onToggle(name, value)} />
          </div>
        )}

        {/* CTA au milieu de la card plutôt qu'en pied de card — la description passe ici en texte
            statique (plus au survol) puisqu'un module non autorisé n'a pas d'autre endroit pour
            l'afficher sans chevaucher ce bouton. */}
        {!authorized && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            {description && <p className="text-xs leading-relaxed text-white/80">{description}</p>}
            <a
              href={activationMailto(clientSiteId, displayName, price)}
              className="shrink-0 rounded-button bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition-opacity hover:opacity-90"
            >
              {price ? `Activer pour ${price}` : "Contacte l'agence pour l'activer"}
            </a>
          </div>
        )}

        <span className="absolute bottom-3 left-4 right-4 text-lg font-bold text-white drop-shadow-sm transition-opacity duration-200 group-hover:opacity-0">
          {displayName}
        </span>
      </div>

      {authorized && enabled && fields && fields.length > 0 && (
        <div className="flex flex-col gap-2 p-4">
          {fields.map((field) => (
            <label key={field.key} className="flex flex-col gap-1 text-xs font-medium text-gray-text">
              {field.label}
              <input
                className={fieldInputClass}
                placeholder={field.placeholder}
                value={values[field.key] ?? ""}
                onChange={(e) => onFieldChange(field.key, e.target.value)}
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// Valeurs actuelles des champs configurables (address/apiKey…) pour les modules autorisés qui en
// ont — sert de base à la fois pour préremplir les inputs et pour détecter les modifications non
// enregistrées (comparaison avec les brouillons dans isDirty).
function fieldsFromModules(modules: ModulesConfig): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};
  for (const [name, fields] of Object.entries(MODULE_FIELDS)) {
    const config = modules[name];
    if (!config || config.authorized === false) continue;
    result[name] = Object.fromEntries(
      fields.map((f) => [f.key, typeof config[f.key] === "string" ? (config[f.key] as string) : ""])
    );
  }
  return result;
}

// Actif (autorisé + activé) avant disponible (autorisé, pas encore activé par le client) avant
// indisponible (pas autorisé) — ordre demandé par Ethan pour la grille de cards.
function statusRank(config: ModuleConfig): number {
  const authorized = config.authorized !== false;
  const enabled = Boolean(config.enabled);
  if (authorized && enabled) return 0;
  if (authorized) return 1;
  return 2;
}

const STATUS_FILTERS = [
  { label: "Tous", rank: null },
  { label: "Activé", rank: 0 },
  { label: "Désactivé", rank: 1 },
  { label: "Disponible", rank: 2 },
] as const;

export default function ModulesSection({ clientSiteId, password }: ModulesSectionProps) {
  const [modules, setModules] = useState<ModulesConfig | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [statusFilter, setStatusFilter] = useState<number | null>(null);

  const load = () =>
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/modules`, password)
      .then((res) => res.json())
      .then((data: ModulesConfig) => {
        setModules(data);
        setDrafts(fieldsFromModules(data));
      });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = async (name: string, enabled: boolean) => {
    await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/modules/${name}`, password, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    load();
  };

  const updateField = (name: string, key: string, value: string) => {
    setDrafts((current) => ({ ...current, [name]: { ...current[name], [key]: value } }));
  };

  const savedFields = modules ? fieldsFromModules(modules) : {};
  const isDirty = Object.entries(drafts).some(([name, fields]) =>
    Object.entries(fields).some(([key, value]) => (savedFields[name]?.[key] ?? "") !== value)
  );

  const handleSave = async () => {
    setSaveStatus("saving");
    await Promise.all(
      Object.entries(drafts).map(([name, fields]) =>
        adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/modules/${name}/config`, password, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        })
      )
    );
    await load();
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus((current) => (current === "saved" ? "idle" : current)), 1500);
  };

  const visibleModules = modules
    ? Object.entries(modules)
        .filter(([, config]) => statusFilter === null || statusRank(config) === statusFilter)
        .sort(([, a], [, b]) => statusRank(a) - statusRank(b))
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-navy">Modules disponibles</h1>
        <div className="flex items-center gap-3">
          {saveStatus === "saved" && <span className="text-sm text-green-accent">Enregistré</span>}
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

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => setStatusFilter(option.rank)}
            className={`rounded-pill px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              statusFilter === option.rank
                ? "bg-brand-gradient text-white"
                : "bg-white text-gray-text hover:text-navy"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {!modules ? (
        <p className="text-gray-text">Chargement…</p>
      ) : (
        <div className="grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibleModules.map(([name, config]) => (
            <ModuleCard
              key={name}
              clientSiteId={clientSiteId}
              name={name}
              config={config}
              fields={MODULE_FIELDS[name]}
              values={drafts[name] ?? {}}
              onFieldChange={(key, value) => updateField(name, key, value)}
              onToggle={toggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
