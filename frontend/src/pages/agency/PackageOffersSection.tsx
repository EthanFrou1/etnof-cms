import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import { adminFetch } from "../../hooks/useAdminSession";
import { IconCheck } from "../../components/admin/icons";
import { inputClass, type PackageOffer } from "./shared";

const emptyPackageOfferForm = { name: "", price: "", description: "", features: [] as string[], highlighted: false };

function formFromOffer(offer: PackageOffer) {
  return {
    name: offer.name,
    price: offer.price,
    description: offer.description,
    features: offer.features,
    highlighted: offer.highlighted,
  };
}

// Modal unique pour créer ou modifier une formule — le bouton de soumission ne devient cliquable
// qu'une fois le nom et le prix renseignés (seules infos nécessaires à la création).
function PackageOfferFormModal({
  password,
  editing,
  onClose,
  onSaved,
}: {
  password: string;
  editing: PackageOffer | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(editing ? formFromOffer(editing) : emptyPackageOfferForm);
  const [saving, setSaving] = useState(false);

  const missingRequired = !form.name.trim() || !form.price.trim();

  const updateFeature = (index: number, value: string) =>
    setForm((f) => ({ ...f, features: f.features.map((feat, i) => (i === index ? value : feat)) }));
  const addFeature = () => setForm((f) => ({ ...f, features: [...f.features, ""] }));
  const removeFeature = (index: number) => setForm((f) => ({ ...f, features: f.features.filter((_, i) => i !== index) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const path = editing ? `/api/admin/package-offers/${editing.id}` : "/api/admin/package-offers";
    await adminFetch(API_BASE_URL, path, password, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, features: form.features.map((f) => f.trim()).filter(Boolean) }),
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
          <h2 className="text-lg font-bold text-navy">{editing ? "Modifier la formule" : "Ajouter une formule"}</h2>
          <button type="button" onClick={onClose} className="text-xl leading-none text-gray-text hover:text-navy">
            ×
          </button>
        </div>

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
          <textarea
            className={inputClass}
            placeholder="Description (ex : Pour les indépendants, artisans et petites entreprises...)"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-text">Fonctionnalités (une par ligne)</span>
            {form.features.map((feature, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className={`${inputClass} flex-1`}
                  placeholder="ex : Design moderne et responsive"
                  value={feature}
                  onChange={(e) => updateFeature(i, e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeFeature(i)}
                  className="shrink-0 text-lg leading-none text-gray-text hover:text-red-500"
                >
                  ×
                </button>
              </div>
            ))}
            <button type="button" onClick={addFeature} className="self-start text-sm font-medium text-brand-mid hover:text-brand-start">
              + Ajouter une fonctionnalité
            </button>
          </div>

          <label className="flex items-center gap-2 text-sm text-navy">
            <input
              type="checkbox"
              checked={form.highlighted}
              onChange={(e) => setForm({ ...form, highlighted: e.target.checked })}
              className="h-4 w-4 accent-brand-mid"
            />
            Mettre en avant (badge "Le plus populaire")
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

function OfferCard({ offer, onEdit, onDelete }: { offer: PackageOffer; onEdit: () => void; onDelete: () => void }) {
  const highlighted = offer.highlighted;

  return (
    <div
      className={`flex flex-col rounded-card p-8 ${
        highlighted ? "bg-brand-gradient text-white shadow-card" : "border border-border-subtle bg-white shadow-card"
      }`}
    >
      {highlighted && (
        <span className="mb-3 inline-flex w-fit items-center rounded-pill bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.05em]">
          Le plus populaire
        </span>
      )}

      <h3 className={`text-xl font-bold ${highlighted ? "text-white" : "text-navy"}`}>{offer.name}</h3>
      {offer.description && (
        <p className={`mt-2 text-sm leading-relaxed ${highlighted ? "text-white/90" : "text-gray-text"}`}>
          {offer.description}
        </p>
      )}

      <div className={`mt-6 text-4xl font-black ${highlighted ? "text-white" : "text-navy"}`}>{offer.price}</div>

      {offer.features.length > 0 && (
        <ul className="mt-6 flex flex-col gap-2">
          {offer.features.map((feature, i) => (
            <li key={i} className={`flex items-start gap-2 text-sm ${highlighted ? "text-white/90" : "text-gray-text"}`}>
              <IconCheck className={`mt-0.5 h-4 w-4 shrink-0 ${highlighted ? "text-white" : "text-green-accent"}`} />
              {feature}
            </li>
          ))}
        </ul>
      )}

      <div className={`mt-8 flex gap-3 border-t pt-4 text-sm ${highlighted ? "border-white/20" : "border-border-subtle"}`}>
        <button
          type="button"
          onClick={onEdit}
          className={`font-medium ${highlighted ? "text-white hover:text-white/80" : "text-brand-mid hover:text-brand-start"}`}
        >
          Modifier
        </button>
        <button
          type="button"
          onClick={onDelete}
          className={`font-medium ${highlighted ? "text-white hover:text-white/80" : "text-red-500 hover:text-red-600"}`}
        >
          Supprimer
        </button>
      </div>
    </div>
  );
}

export default function PackageOffersSection({ password }: { password: string }) {
  const [offers, setOffers] = useState<PackageOffer[] | null>(null);
  const [modal, setModal] = useState<"create" | PackageOffer | null>(null);

  const load = () =>
    adminFetch(API_BASE_URL, "/api/admin/package-offers", password)
      .then((res) => res.json())
      .then(setOffers);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: string) => {
    await adminFetch(API_BASE_URL, `/api/admin/package-offers/${id}`, password, { method: "DELETE" });
    load();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">Formules</h1>
          <p className="text-sm text-gray-text">
            Tes formules de base (Essentiel, Business, Sur mesure...) — utilisables pour préremplir rapidement une
            ligne de devis/facture, en plus de tes modules à la carte.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal("create")}
          className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white hover:opacity-90"
        >
          + Ajouter une formule
        </button>
      </div>

      {!offers ? (
        <p className="text-gray-text">Chargement…</p>
      ) : offers.length === 0 ? (
        <section className="rounded-card bg-white p-8 shadow-card">
          <p className="text-sm text-gray-text">Aucune formule pour l'instant.</p>
        </section>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {offers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} onEdit={() => setModal(offer)} onDelete={() => handleDelete(offer.id)} />
          ))}
        </div>
      )}

      {modal && (
        <PackageOfferFormModal
          password={password}
          editing={modal === "create" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
