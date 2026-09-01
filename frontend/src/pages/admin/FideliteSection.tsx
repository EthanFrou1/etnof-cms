import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import { adminFetch } from "../../hooks/useAdminSession";
import SaveButton from "../../components/admin/SaveButton";

type FideliteSectionProps = {
  clientSiteId: string;
  password: string;
};

type Settings = { mode: "points" | "stamps"; pointsPerEuro: number; threshold: number; rewardDescription: string };

const inputClass =
  "rounded-button border border-border-subtle bg-white px-3 py-2 text-sm text-navy placeholder:text-gray-text/60 focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20";

export default function FideliteSection({ clientSiteId, password }: FideliteSectionProps) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState<Settings | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/loyalty-settings`, password)
      .then((res) => res.json())
      .then((data: Settings) => {
        setSettings(data);
        setForm(data);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!settings || !form) return <p className="text-gray-text">Chargement…</p>;

  const isDirty = JSON.stringify(form) !== JSON.stringify(settings);

  const handleSave = async () => {
    setSaveStatus("saving");
    const res = await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/loyalty-settings`, password, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const updated: Settings = await res.json();
      setSettings(updated);
      setForm(updated);
      setSaveStatus("saved");
    } else {
      setSaveStatus("error");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-navy">Fidélité</h1>
        <SaveButton status={saveStatus} onClick={handleSave} onIdle={() => setSaveStatus("idle")} disabled={!isDirty} />
      </div>

      <section className="flex flex-col gap-5 rounded-card bg-white p-8 shadow-card">
        <p className="text-sm text-gray-text">
          Le client suit sa progression depuis son compte (module Compte client). Aucune réduction n'est
          appliquée automatiquement au paiement — une fois le palier atteint, c'est à toi de gérer la
          récompense comme tu l'entends, puis de la marquer « utilisée » depuis la fiche du client
          concerné pour repartir à zéro.
        </p>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-text">Mécanisme</span>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label
              className={`flex flex-1 cursor-pointer flex-col gap-1 rounded-button border p-4 text-sm transition-colors ${
                form.mode === "stamps" ? "border-brand-mid bg-brand-mid/5" : "border-border-subtle"
              }`}
            >
              <span className="flex items-center gap-2 font-semibold text-navy">
                <input type="radio" checked={form.mode === "stamps"} onChange={() => setForm({ ...form, mode: "stamps" })} />
                Carte à tampons
              </span>
              <span className="text-gray-text">Après N commandes, la récompense est débloquée.</span>
            </label>
            <label
              className={`flex flex-1 cursor-pointer flex-col gap-1 rounded-button border p-4 text-sm transition-colors ${
                form.mode === "points" ? "border-brand-mid bg-brand-mid/5" : "border-border-subtle"
              }`}
            >
              <span className="flex items-center gap-2 font-semibold text-navy">
                <input type="radio" checked={form.mode === "points"} onChange={() => setForm({ ...form, mode: "points" })} />
                Points par euro dépensé
              </span>
              <span className="text-gray-text">X points par euro, convertibles en récompense à un palier donné.</span>
            </label>
          </div>
        </div>

        {form.mode === "points" && (
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
            Points par euro dépensé
            <input
              type="number"
              min={0}
              step="0.1"
              className={inputClass}
              value={form.pointsPerEuro}
              onChange={(e) => setForm({ ...form, pointsPerEuro: Number(e.target.value) })}
            />
          </label>
        )}

        <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
          {form.mode === "points" ? "Points nécessaires pour la récompense" : "Nombre de commandes nécessaires"}
          <input
            type="number"
            min={1}
            className={inputClass}
            value={form.threshold}
            onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
          Récompense (texte libre affiché au client)
          <input
            className={inputClass}
            placeholder="Ex. « 5€ de réduction », « Café offert »…"
            value={form.rewardDescription}
            onChange={(e) => setForm({ ...form, rewardDescription: e.target.value })}
          />
        </label>
      </section>
    </div>
  );
}
