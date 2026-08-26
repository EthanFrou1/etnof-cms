import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import type { Offer, SiteContent } from "../../hooks/useContent";
import { adminFetch } from "../../hooks/useAdminSession";
import { useModules } from "../../hooks/useModules";
import Select from "../../components/admin/Select";

type EditableOffer = Offer & { id: string };

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
};

const inputClass =
  "rounded-button border border-border-subtle bg-white px-3 py-2 text-navy placeholder:text-gray-text/60 focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20";

type OffersSectionProps = {
  clientSiteId: string;
  password: string;
};

// Offres = mises en avant / grille tarifaire du site, indépendantes du module Catalogue (utilisable
// par un client sans produits, ex. un artisan de service). Quand Catalogue est activé, chaque offre
// peut en plus être reliée à un produit existant (reprend son nom/prix, reste modifiable ensuite).
export default function OffersSection({ clientSiteId, password }: OffersSectionProps) {
  const modules = useModules(clientSiteId);
  const catalogueEnabled = Boolean(modules?.catalogue?.enabled);

  // Champs de SiteContent édités sur d'autres pages (Contenu, Établissement) mais partagés via le
  // même endpoint PUT /admin/content — renvoyés tels que chargés pour ne pas les écraser à vide.
  const [content, setContent] = useState<SiteContent | null>(null);
  const [offers, setOffers] = useState<EditableOffer[]>([]);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/t/${clientSiteId}/content`)
      .then((res) => res.json())
      .then((data: SiteContent) => {
        setContent(data);
        setOffers(data.offers);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!catalogueEnabled) return;
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/catalogue/products`, password)
      .then((res) => res.json())
      .then(setProducts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogueEnabled]);

  const addOffer = () =>
    setOffers([...offers, { id: crypto.randomUUID(), title: "", price: "", description: "", productId: null }]);

  const updateOffer = (id: string, patch: Partial<EditableOffer>) =>
    setOffers(offers.map((o) => (o.id === id ? { ...o, ...patch } : o)));

  const removeOffer = (id: string) => setOffers(offers.filter((o) => o.id !== id));

  // Reprend nom/prix/description du produit choisi — reste modifiable ensuite comme un champ libre.
  const linkProduct = (offerId: string, productId: string) => {
    if (!productId) {
      updateOffer(offerId, { productId: null });
      return;
    }
    const product = products?.find((p) => p.id === productId);
    if (!product) return;
    updateOffer(offerId, {
      productId,
      title: product.name,
      price: `${product.price.toFixed(2)} €`,
      description: product.description,
    });
  };

  // "Enregistrer" ne s'active que si les offres diffèrent de la dernière version chargée/sauvegardée
  // (`content`) — comparaison champ à champ, l'id étant régénéré côté serveur à chaque sauvegarde
  // (voir ContentEndpoints.cs) donc sans valeur de comparaison.
  const offersEqual = (a: EditableOffer[], b: Offer[]) =>
    a.length === b.length &&
    a.every(
      (o, i) =>
        o.title === b[i].title &&
        o.price === b[i].price &&
        o.description === b[i].description &&
        o.productId === b[i].productId
    );

  const isDirty = Boolean(content && !offersEqual(offers, content.offers));

  const handleSave = async () => {
    if (!content) return;
    setStatus("saving");
    const res = await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/content`, password, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteName: content.siteName,
        description: content.description,
        storyContent: content.storyContent,
        offers: offers.map(({ title, price, description, productId }) => ({ title, price, description, productId })),
        establishmentName: content.establishmentName,
        establishmentType: content.establishmentType,
        address: content.address,
        phone: content.phone,
        email: content.email,
        managerName: content.managerName,
        managerPhone: content.managerPhone,
        managerEmail: content.managerEmail,
        googlePlaceId: content.googlePlaceId,
        googlePlaceName: content.googlePlaceName,
        openingHours: content.openingHours,
        cgvContent: content.cgvContent,
      }),
    });
    if (res.ok) {
      setContent(await res.json());
      setStatus("saved");
    } else {
      setStatus("error");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-navy">Offres</h1>
        <div className="flex items-center gap-3">
          {status === "saved" && <span className="text-sm text-green-accent">Enregistré</span>}
          {status === "error" && <span className="text-sm text-red-500">Erreur lors de l'enregistrement.</span>}
          <button
            type="button"
            onClick={handleSave}
            disabled={status === "saving" || !isDirty}
            className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {status === "saving" ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>

      <section className="rounded-card bg-white p-8 shadow-card">
        <p className="mb-4 text-sm text-gray-text">
          Mises en avant affichées sur le site public (grille tarifaire, promos…).
          {catalogueEnabled
            ? " Une offre peut être reliée à un produit du catalogue pour reprendre son nom et son prix."
            : ""}
        </p>
        <div className="flex flex-col gap-3">
          {offers.map((offer) => (
            <div key={offer.id} className="flex flex-col gap-2 rounded-button border border-border-subtle p-3">
              {catalogueEnabled && (
                <label className="flex flex-col gap-1 text-xs font-medium text-gray-text">
                  Produit associé (facultatif)
                  <Select
                    className={inputClass}
                    value={offer.productId ?? ""}
                    onChange={(productId) => linkProduct(offer.id, productId)}
                    options={[
                      { value: "", label: "Aucun — offre libre" },
                      ...(products?.map((p) => ({ value: p.id, label: p.name })) ?? []),
                    ]}
                  />
                </label>
              )}
              <label className="flex flex-col gap-1 text-xs font-medium text-gray-text">
                Titre
                <input
                  className={inputClass}
                  placeholder="Titre"
                  value={offer.title}
                  onChange={(e) => updateOffer(offer.id, { title: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-gray-text">
                Prix
                <input
                  className={inputClass}
                  placeholder="Prix"
                  value={offer.price}
                  onChange={(e) => updateOffer(offer.id, { price: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-gray-text">
                Description
                <input
                  className={inputClass}
                  placeholder="Description"
                  value={offer.description}
                  onChange={(e) => updateOffer(offer.id, { description: e.target.value })}
                />
              </label>
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
    </div>
  );
}
