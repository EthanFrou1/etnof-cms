import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import { adminFetch } from "../../hooks/useAdminSession";
import { inputClass, type ModuleMeta } from "./shared";

// Ne garde que les chiffres — le prix est toujours affiché en euros (ModulesSection.tsx applique
// la même règle côté admin client), pas la peine de laisser Ethan taper "€"/"EUR" lui-même.
const onlyDigits = (value: string) => value.replace(/[^0-9]/g, "");

// Prix affiché sur la card d'un module non autorisé côté admin client ("Activer pour {price}") —
// voir ModulesSection.tsx. Global au socle, pas par client.
export default function PricingSection({ password }: { password: string }) {
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-navy">Tarifs des modules</h1>
        <p className="text-sm text-gray-text">
          Affiché aux clients sur la card d'un module qu'ils n'ont pas encore ("Activer pour {"{prix}"} €"). Laisser
          vide pour ne pas afficher de prix — toujours en euros.
        </p>
      </div>

      {!modules ? (
        <p className="text-sm text-gray-text">Chargement…</p>
      ) : (
        <section className="rounded-card bg-white p-6 shadow-card">
          <div className="flex flex-col gap-3">
            {modules.map((m) => (
              <div key={m.name} className="flex flex-wrap items-center gap-3">
                <span className="w-40 shrink-0 text-sm font-medium text-navy">{m.displayName}</span>
                <div className="relative">
                  <input
                    className={`${inputClass} pr-7`}
                    placeholder="ex : 250"
                    inputMode="numeric"
                    value={drafts[m.name] ?? ""}
                    onChange={(e) => setDrafts({ ...drafts, [m.name]: onlyDigits(e.target.value) })}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-gray-text/60">
                    €
                  </span>
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
      )}
    </div>
  );
}
