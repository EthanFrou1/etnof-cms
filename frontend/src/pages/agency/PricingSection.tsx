import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import { adminFetch } from "../../hooks/useAdminSession";
import { inputClass, type ModuleMeta } from "./shared";
import ModuleThumbnail from "../../components/admin/ModuleThumbnail";
import SaveButton, { type SaveStatus } from "../../components/admin/SaveButton";

// Ne garde que les chiffres — le prix est toujours affiché en euros (ModulesSection.tsx applique
// la même règle côté admin client), pas la peine de laisser Ethan taper "€"/"EUR" lui-même.
const onlyDigits = (value: string) => value.replace(/[^0-9]/g, "");

// Sentinelle "Gratuit" — distincte d'un prix vide (= pas encore chiffré, CTA générique côté client,
// voir ModulesSection.tsx) : un module marqué gratuit affiche "Gratuit" au lieu de "Activer pour
// {prix}". Ne change rien à l'autorisation par tenant, qui reste manuelle (décision d'Ethan) — juste
// l'affichage du prix, même si le module est gratuit.
const FREE_SENTINEL = "Gratuit";
const isFree = (price: string) => price.trim().toLowerCase() === FREE_SENTINEL.toLowerCase();
const normalizedPrice = (price: string) => (isFree(price) ? FREE_SENTINEL : onlyDigits(price));

function VisibilityToggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div className="h-5 w-9 rounded-full bg-border-subtle transition-colors duration-200 peer-checked:bg-green-accent" />
      <div className="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 peer-checked:translate-x-4" />
    </label>
  );
}

// Prix affiché sur la card d'un module non autorisé côté admin client ("Activer pour {price}") —
// voir ModulesSection.tsx. Global au socle, pas par client.
export default function PricingSection({ password }: { password: string }) {
  const [modules, setModules] = useState<ModuleMeta[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [rowStatus, setRowStatus] = useState<Record<string, SaveStatus>>({});

  const load = () =>
    adminFetch(API_BASE_URL, "/api/admin/modules", password)
      .then((res) => res.json())
      .then((data: ModuleMeta[]) => {
        setModules(data);
        setDrafts(Object.fromEntries(data.map((m) => [m.name, normalizedPrice(m.price)])));
      });

  // Visibilité dans le catalogue de TOUS les clients (indépendant de l'autorisation par client,
  // qui se fait toujours depuis la fiche client dans SitesSection.tsx). Sauvegarde immédiate, pas
  // de brouillon — comme le toggle enabled/disabled de ModulesSection.tsx côté client.
  const toggleVisible = async (name: string, visible: boolean) => {
    setModules((current) => current?.map((m) => (m.name === name ? { ...m, visible } : m)) ?? current);
    await adminFetch(API_BASE_URL, `/api/admin/modules/${name}/visibility`, password, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visible }),
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (name: string) => {
    setRowStatus((s) => ({ ...s, [name]: "saving" }));
    const res = await adminFetch(API_BASE_URL, `/api/admin/modules/${name}/price`, password, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price: drafts[name] ?? "" }),
    });
    setRowStatus((s) => ({ ...s, [name]: res.ok ? "saved" : "error" }));
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-navy">Tarifs des modules</h1>
        <p className="text-sm text-gray-text">
          Affiché aux clients sur la card d'un module qu'ils n'ont pas encore ("Activer pour {"{prix}"} €"). Laisser
          vide pour ne pas afficher de prix — toujours en euros. Coche "Gratuit" pour un module sans coût :
          l'autorisation par client reste manuelle comme pour les autres, seul l'affichage change. Le toggle
          "Visible" masque un module du catalogue de tous les clients — sauf ceux pour qui tu l'as autorisé
          individuellement depuis leur fiche.
        </p>
      </div>

      {!modules ? (
        <p className="text-sm text-gray-text">Chargement…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <div key={m.name} className="flex flex-col gap-3 rounded-card bg-white p-4 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <ModuleThumbnail name={m.name} displayName={m.displayName} />
                  <span className="text-sm font-semibold text-navy">{m.displayName}</span>
                </div>
                <label className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-gray-text">
                  Visible
                  <VisibilityToggle checked={m.visible} onChange={(value) => toggleVisible(m.name, value)} />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isFree(drafts[m.name] ?? "") ? (
                  <span className="rounded-button border border-border-subtle px-3 py-2 text-sm font-medium text-navy">
                    Gratuit
                  </span>
                ) : (
                  <div className="relative">
                    <input
                      className={`${inputClass} w-24 pr-7`}
                      placeholder="ex : 250"
                      inputMode="numeric"
                      value={drafts[m.name] ?? ""}
                      onChange={(e) => setDrafts({ ...drafts, [m.name]: onlyDigits(e.target.value) })}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-gray-text/60">
                      €
                    </span>
                  </div>
                )}
                <label className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-gray-text">
                  <input
                    type="checkbox"
                    checked={isFree(drafts[m.name] ?? "")}
                    onChange={(e) => setDrafts({ ...drafts, [m.name]: e.target.checked ? FREE_SENTINEL : "" })}
                  />
                  Gratuit
                </label>
                <SaveButton
                  status={rowStatus[m.name] ?? "idle"}
                  onClick={() => handleSave(m.name)}
                  onIdle={() => setRowStatus((s) => ({ ...s, [m.name]: "idle" }))}
                  disabled={(drafts[m.name] ?? "") === normalizedPrice(m.price)}
                  size="sm"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
