import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import { adminFetch } from "../../hooks/useAdminSession";
import ConfirmModal from "../../components/admin/ConfirmModal";

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

function AddProductModal({ clientSiteId, password, onClose, onCreated }: AddProductModalProps) {
  const [form, setForm] = useState(emptyForm);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

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
  const [showModal, setShowModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const loadProducts = () =>
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/catalogue/products`, password)
      .then((res) => res.json())
      .then(setProducts);

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            {products ? `${products.length} produit${products.length > 1 ? "s" : ""}` : "Chargement…"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white hover:opacity-90"
        >
          + Ajouter un produit
        </button>
      </div>

      {!products ? null : products.length === 0 ? (
        <section className="rounded-card bg-white p-8 shadow-card">
          <p className="text-gray-text">Aucun produit pour l'instant.</p>
        </section>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => {
            const thumbnail = product.images[0];
            return (
              <article
                key={product.id}
                onClick={() => {
                  window.location.href = `/admin/${clientSiteId}/products/${product.id}`;
                }}
                className="flex cursor-pointer flex-col overflow-hidden rounded-card bg-white shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-soft"
              >
                <div className="aspect-[16/10] bg-bg-page-start">
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
                    className="mt-2 self-start text-sm text-red-500 hover:text-red-600"
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
