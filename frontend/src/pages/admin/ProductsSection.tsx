import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import { adminFetch } from "../../hooks/useAdminSession";
import ConfirmModal from "../../components/admin/ConfirmModal";
import Select from "../../components/admin/Select";

type ProductImage = {
  id: string;
  path: string;
};

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  images: ProductImage[];
  collectionId: string | null;
  highlighted: boolean;
};

type Collection = {
  id: string;
  name: string;
};

type ProductsSectionProps = {
  clientSiteId: string;
  password: string;
};

const inputClass =
  "rounded-button border border-border-subtle bg-white px-3 py-2 text-navy placeholder:text-gray-text/60 focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20";

const emptyForm = { name: "", description: "", price: "", stock: "" };

type AddProductModalProps = {
  clientSiteId: string;
  password: string;
  onClose: () => void;
  onCreated: () => void;
};

type PendingSize = { label: string; stock: string };

function AddProductModal({ clientSiteId, password, onClose, onCreated }: AddProductModalProps) {
  const [form, setForm] = useState(emptyForm);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [sizes, setSizes] = useState<PendingSize[]>([]);
  const [sizeLabel, setSizeLabel] = useState("");
  const [sizeStock, setSizeStock] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const addSize = () => {
    if (!sizeLabel.trim()) return;
    setSizes((current) => [...current, { label: sizeLabel.trim(), stock: sizeStock }]);
    setSizeLabel("");
    setSizeStock("");
  };

  const removeSize = (index: number) => setSizes((current) => current.filter((_, i) => i !== index));

  useEffect(() => {
    const urls = photos.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [photos]);

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    setPhotos((current) => [...current, ...Array.from(files)]);
  };

  const removePhoto = (index: number) => setPhotos((current) => current.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    setStatus("saving");
    setError(null);

    const res = await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/catalogue/products`, password, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description,
        price: Number(form.price) || 0,
        stock: Number(form.stock) || 0,
      }),
    });

    if (!res.ok) {
      setStatus("error");
      setError("Le produit n'a pas pu être créé.");
      return;
    }

    const product = (await res.json()) as Product;

    for (const file of photos) {
      const body = new FormData();
      body.append("file", file);
      const imgRes = await adminFetch(
        API_BASE_URL,
        `/api/t/${clientSiteId}/admin/catalogue/products/${product.id}/images`,
        password,
        { method: "POST", body }
      );
      if (!imgRes.ok) {
        setStatus("error");
        setError("Le produit a été créé, mais une photo n'a pas pu être envoyée.");
        onCreated();
        return;
      }
    }

    for (const size of sizes) {
      const sizeRes = await adminFetch(
        API_BASE_URL,
        `/api/t/${clientSiteId}/admin/catalogue/products/${product.id}/sizes`,
        password,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: size.label, stock: Number(size.stock) || 0 }),
        }
      );
      if (!sizeRes.ok) {
        setStatus("error");
        setError("Le produit a été créé, mais une taille n'a pas pu être enregistrée.");
        onCreated();
        return;
      }
    }

    setStatus("success");
    onCreated();
    setTimeout(onClose, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4">
      <div className="w-full max-w-lg rounded-card bg-white p-8 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy">Ajouter un produit</h2>
          <button type="button" onClick={onClose} className="text-xl leading-none text-gray-text hover:text-navy">
            ×
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
            Nom
            <input
              className={inputClass}
              placeholder="Nom"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
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
          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-gray-text">
              Prix (€)
              <input
                className={inputClass}
                placeholder="Prix (€)"
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-gray-text">
              Stock
              <input
                className={inputClass}
                placeholder="Stock"
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            {previews.map((url, index) => (
              <div key={url} className="relative">
                <img src={url} alt="" className="h-16 w-16 rounded-button object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute -right-2 -top-2 h-5 w-5 rounded-full bg-red-500 text-xs text-white"
                >
                  ×
                </button>
              </div>
            ))}
            <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-button border border-dashed border-border-subtle text-xs text-gray-text hover:border-brand-mid">
              + Photo
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  addPhotos(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-text">Tailles (facultatif)</span>
            {sizes.length > 0 && (
              <div className="flex flex-col gap-2">
                {sizes.map((size, index) => (
                  <div key={index} className="flex items-center gap-3 rounded-button border border-border-subtle p-2">
                    <span className="w-16 shrink-0 font-medium text-navy">{size.label}</span>
                    <span className="text-xs text-gray-text">{size.stock || 0} en stock</span>
                    <button
                      type="button"
                      onClick={() => removeSize(index)}
                      className="ml-auto text-sm text-red-500 hover:text-red-600"
                    >
                      Supprimer
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                className={`${inputClass} w-24`}
                placeholder="Taille (ex. M)"
                value={sizeLabel}
                onChange={(e) => setSizeLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSize())}
              />
              <input
                className={`${inputClass} w-20`}
                type="number"
                min={0}
                placeholder="Stock"
                value={sizeStock}
                onChange={(e) => setSizeStock(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSize())}
              />
              <button
                type="button"
                onClick={addSize}
                disabled={!sizeLabel.trim()}
                className="rounded-button border border-border-subtle px-3 py-2 text-sm font-semibold text-navy hover:bg-bg-page-start disabled:cursor-not-allowed disabled:opacity-40"
              >
                Ajouter
              </button>
            </div>
          </div>

          {status === "error" && error && <p className="text-red-500">{error}</p>}
          {status === "success" && <p className="text-green-accent">Produit ajouté avec succès.</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={status === "saving" || status === "success" || !form.name}
              className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {status === "saving" ? "Ajout…" : "Ajouter"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-button border border-border-subtle px-4 py-2.5 font-semibold text-gray-text hover:bg-bg-page-start"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductsSection({ clientSiteId, password }: ProductsSectionProps) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionFilter, setCollectionFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const loadProducts = () =>
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/catalogue/products`, password)
      .then((res) => res.json())
      .then(setProducts);

  useEffect(() => {
    loadProducts();
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/catalogue/collections`, password)
      .then((res) => res.json())
      .then(setCollections);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleProducts = products?.filter((p) => !collectionFilter || p.collectionId === collectionFilter) ?? null;

  const handleDelete = async (id: string) => {
    await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/catalogue/products/${id}`, password, {
      method: "DELETE",
    });
    setProductToDelete(null);
    loadProducts();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">Produits</h1>
          <p className="text-sm text-gray-text">
            {visibleProducts ? `${visibleProducts.length} produit${visibleProducts.length > 1 ? "s" : ""}` : "Chargement…"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {collections.length > 0 && (
            <div className="w-52 shrink-0">
              <Select
                className="rounded-button border border-border-subtle bg-white px-3 py-2 text-sm text-navy focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20"
                value={collectionFilter}
                onChange={setCollectionFilter}
                options={[{ value: "", label: "Toutes les collections" }, ...collections.map((c) => ({ value: c.id, label: c.name }))]}
              />
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white hover:opacity-90"
          >
            + Ajouter un produit
          </button>
        </div>
      </div>

      {!visibleProducts ? null : visibleProducts.length === 0 ? (
        <section className="rounded-card bg-white p-8 shadow-card">
          <p className="text-gray-text">
            {collectionFilter ? "Aucun produit dans cette collection." : "Aucun produit pour l'instant."}
          </p>
        </section>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleProducts.map((product) => {
            const thumbnail = product.images[0];
            const collectionName = collections.find((c) => c.id === product.collectionId)?.name;
            return (
              <article
                key={product.id}
                onClick={() => {
                  window.location.href = `/admin/${clientSiteId}/products/${product.id}`;
                }}
                className="flex cursor-pointer flex-col overflow-hidden rounded-card bg-white shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-soft"
              >
                <div className="relative aspect-[2/1] bg-bg-page-start">
                  {thumbnail ? (
                    <img
                      src={`${API_BASE_URL}${thumbnail.path}`}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-gray-text/40">
                      Pas de photo
                    </div>
                  )}
                  {product.highlighted && (
                    <span className="absolute left-2 top-2 rounded-pill bg-white/90 px-2 py-0.5 text-xs font-semibold text-amber-500">
                      ★ Mis en avant
                    </span>
                  )}
                  {collectionName && (
                    <span className="absolute right-2 top-2 rounded-pill bg-white/90 px-2 py-0.5 text-xs font-semibold text-brand-mid">
                      {collectionName}
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-2 p-5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-bold text-navy">{product.name}</span>
                    <span className="whitespace-nowrap text-sm font-semibold text-green-accent">
                      {product.price.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                    </span>
                  </div>
                  {product.description && (
                    <p className="text-sm leading-relaxed text-gray-text">{product.description}</p>
                  )}
                  <span className="text-xs font-semibold text-gray-text">Stock : {product.stock}</span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setProductToDelete(product);
                    }}
                    className="mt-2 self-start rounded-button border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-500 hover:border-red-300 hover:bg-red-100 hover:text-red-600"
                  >
                    Supprimer le produit
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {showModal && (
        <AddProductModal
          clientSiteId={clientSiteId}
          password={password}
          onClose={() => setShowModal(false)}
          onCreated={loadProducts}
        />
      )}

      {productToDelete && (
        <ConfirmModal
          title={`Supprimer "${productToDelete.name}" ?`}
          message="Cette action est définitive : le produit et ses photos seront supprimés."
          onConfirm={() => handleDelete(productToDelete.id)}
          onCancel={() => setProductToDelete(null)}
        />
      )}
    </div>
  );
}
