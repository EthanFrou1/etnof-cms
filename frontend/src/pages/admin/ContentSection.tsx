import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import type { Offer, SiteContent } from "../../hooks/useContent";
import { adminFetch } from "../../hooks/useAdminSession";

type EditableOffer = Omit<Offer, "id"> & { id: string };

const inputClass =
  "rounded-button border border-border-subtle bg-white px-3 py-2 text-navy placeholder:text-gray-text/60 focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20";

type ContentSectionProps = {
  clientSiteId: string;
  password: string;
};

export default function ContentSection({ clientSiteId, password }: ContentSectionProps) {
  const [siteName, setSiteName] = useState("");
  const [description, setDescription] = useState("");
  const [offers, setOffers] = useState<EditableOffer[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/t/${clientSiteId}/content`)
      .then((res) => res.json())
      .then((data: SiteContent) => {
        setSiteName(data.siteName);
        setDescription(data.description);
        setOffers(data.offers);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addOffer = () =>
    setOffers([...offers, { id: crypto.randomUUID(), title: "", price: "", description: "" }]);

  const updateOffer = (id: string, patch: Partial<EditableOffer>) =>
    setOffers(offers.map((o) => (o.id === id ? { ...o, ...patch } : o)));

  const removeOffer = (id: string) => setOffers(offers.filter((o) => o.id !== id));

  const handleSave = async () => {
    setStatus("saving");
    const res = await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/content`, password, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteName,
        description,
        offers: offers.map(({ title, price, description }) => ({ title, price, description })),
      }),
    });
    setStatus(res.ok ? "saved" : "error");
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold text-navy">Contenu du site</h1>

      <section className="rounded-card bg-white p-8 shadow-card">
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-gray-text">
            Nom du site
            <input className={`mt-1 w-full ${inputClass}`} value={siteName} onChange={(e) => setSiteName(e.target.value)} />
          </label>
          <label className="text-sm font-medium text-gray-text">
            Description
            <textarea
              className={`mt-1 w-full ${inputClass}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="rounded-card bg-white p-8 shadow-card">
        <h2 className="mb-4 text-lg font-bold text-navy">Offres</h2>
        <div className="flex flex-col gap-3">
          {offers.map((offer) => (
            <div key={offer.id} className="flex flex-col gap-2 rounded-button border border-border-subtle p-3">
              <input
                className={inputClass}
                placeholder="Titre"
                value={offer.title}
                onChange={(e) => updateOffer(offer.id, { title: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="Prix"
                value={offer.price}
                onChange={(e) => updateOffer(offer.id, { price: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="Description"
                value={offer.description}
                onChange={(e) => updateOffer(offer.id, { description: e.target.value })}
              />
              <button
                type="button"
                onClick={() => removeOffer(offer.id)}
                className="self-start text-sm text-red-500 hover:text-red-600"
              >
                Supprimer
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addOffer}
            className="self-start text-sm font-medium text-brand-mid hover:text-brand-start"
          >
            + Ajouter une offre
          </button>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={status === "saving"}
          className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          Enregistrer
        </button>
        {status === "saved" && <p className="text-green-accent">Contenu enregistré.</p>}
        {status === "error" && <p className="text-red-500">Erreur lors de l'enregistrement.</p>}
      </div>
    </div>
  );
}
