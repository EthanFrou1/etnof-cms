import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";
import { useAdminSession, adminFetch } from "../hooks/useAdminSession";
import { useModules } from "../hooks/useModules";
import AdminLoginScreen from "../components/admin/AdminLoginScreen";
import AdminLayout from "../components/admin/AdminLayout";

type ProductImage = {
  id: string;
  path: string;
  sortOrder: number;
};

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  images: ProductImage[];
};

type ProductForm = {
  name: string;
  description: string;
  price: string;
  stock: string;
};

type ProductDetailPageProps = {
  clientSiteId: string;
  productId: string;
};

const inputClass =
  "rounded-button border border-border-subtle bg-white px-3 py-2 text-navy placeholder:text-gray-text/60 focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20";

const formatPrice = (value: number) => value.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

function toForm(product: Product): ProductForm {
  return {
    name: product.name,
    description: product.description,
    price: String(product.price),
    stock: String(product.stock),
  };
}

function ProductPreview({ name, price, description, stock, images }: {
  name: string;
  price: string;
  description: string;
  stock: string;
  images: ProductImage[];
}) {
  const cover = images[0];

  return (
    <aside className="flex h-fit flex-col overflow-hidden rounded-card bg-white shadow-card">
      <div className="relative aspect-[4/3] bg-brand-gradient">
        {cover ? (
          <img src={`${API_BASE_URL}${cover.path}`} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-white/50">
            Aucune photo
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 p-7">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xl font-bold text-navy">{name || "Nom du produit"}</span>
          <span className="whitespace-nowrap text-sm font-semibold text-green-accent">
            {formatPrice(Number(price) || 0)}
          </span>
        </div>
        {description && <p className="text-sm leading-relaxed text-gray-text">{description}</p>}
        <span className="text-xs font-semibold text-gray-text">Stock : {stock || 0}</span>
        {images.length > 1 && (
          <div className="mt-1 flex flex-wrap gap-2">
            {images.slice(1).map((img) => (
              <img
                key={img.id}
                src={`${API_BASE_URL}${img.path}`}
                alt=""
                className="h-12 w-12 rounded-button object-cover"
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

function ProductDetailContent({
  clientSiteId,
  productId,
  password,
}: {
  clientSiteId: string;
  productId: string;
  password: string;
}) {
  const [product, setProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const load = () =>
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/catalogue/products/${productId}`, password)
      .then((res) => res.json())
      .then((data: Product) => {
        setProduct(data);
        setForm(toForm(data));
      });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDirty = Boolean(
    product &&
      form &&
      (form.name !== product.name ||
        form.description !== product.description ||
        form.price !== String(product.price) ||
        form.stock !== String(product.stock))
  );

  const handleSave = async () => {
    if (!form) return;
    setSaveStatus("saving");
    const res = await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/catalogue/products/${productId}`, password, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description,
        price: Number(form.price) || 0,
        stock: Number(form.stock) || 0,
      }),
    });
    if (res.ok) {
      const updated = (await res.json()) as Product;
      setProduct(updated);
      setForm(toForm(updated));
    }
    setSaveStatus(res.ok ? "saved" : "error");
  };

  const handleUploadImage = async (file: File) => {
    const body = new FormData();
    body.append("file", file);
    await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/catalogue/products/${productId}/images`, password, {
      method: "POST",
      body,
    });
    load();
  };

  const handleDeleteImage = async (imageId: string) => {
    await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/catalogue/images/${imageId}`, password, {
      method: "DELETE",
    });
    load();
  };

  if (!product || !form) return <p className="text-gray-text">Chargement…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <a href={`/admin/${clientSiteId}/products`} className="text-sm text-brand-mid hover:underline">
            ← Retour aux produits
          </a>
          <h1 className="mt-1 text-2xl font-extrabold text-navy">{product.name || "(sans nom)"}</h1>
        </div>
        <div className="flex items-center gap-3">
          {saveStatus === "saved" && <span className="text-sm text-green-accent">Enregistré</span>}
          {saveStatus === "error" && <span className="text-sm text-red-500">Erreur lors de l'enregistrement.</span>}
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

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section className="rounded-card bg-white p-8 shadow-card">
            <h2 className="mb-4 text-lg font-bold text-navy">Informations</h2>
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm text-gray-text">
                Nom
                <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1 text-sm text-gray-text">
                Description
                <textarea
                  className={inputClass}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </label>
              <div className="flex gap-3">
                <label className="flex flex-1 flex-col gap-1 text-sm text-gray-text">
                  Prix (€)
                  <input
                    className={inputClass}
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </label>
                <label className="flex flex-1 flex-col gap-1 text-sm text-gray-text">
                  Stock
                  <input
                    className={inputClass}
                    type="number"
                    min={0}
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="rounded-card bg-white p-8 shadow-card">
            <h2 className="mb-4 text-lg font-bold text-navy">Photos</h2>
            <div className="flex flex-wrap gap-3">
              {product.images.map((image) => (
                <div key={image.id} className="relative">
                  <img
                    src={`${API_BASE_URL}${image.path}`}
                    alt=""
                    className="h-28 w-28 rounded-button object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(image.id)}
                    className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full bg-red-500 text-xs text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
              <label className="flex h-28 w-28 cursor-pointer items-center justify-center rounded-button border border-dashed border-border-subtle text-xs text-gray-text hover:border-brand-mid">
                + Photo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadImage(file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </section>
        </div>

        <ProductPreview
          name={form.name}
          price={form.price}
          description={form.description}
          stock={form.stock}
          images={product.images}
        />
      </div>
    </div>
  );
}

export default function ProductDetailPage({ clientSiteId, productId }: ProductDetailPageProps) {
  const { password, login } = useAdminSession(clientSiteId);
  const modules = useModules(clientSiteId);

  if (!password) {
    return (
      <AdminLoginScreen
        title="Connecte-toi pour gérer ton site"
        loginPath={`/api/t/${clientSiteId}/admin/login`}
        onLoggedIn={login}
      />
    );
  }

  // Accès direct par URL alors que le module Catalogue n'est pas actif pour ce tenant — même
  // garde que pour /admin/{clientSiteId}/customers/{customerId} (CustomerDetailPage.tsx).
  const blocked = modules !== null && !modules?.catalogue?.enabled;

  return (
    <AdminLayout clientSiteId={clientSiteId} activeSection="products">
      {blocked ? (
        <div className="rounded-card bg-white p-8 shadow-card">
          <p className="text-gray-text">Le module Catalogue n'est pas activé pour ce site — cette page n'est pas disponible.</p>
        </div>
      ) : (
        <ProductDetailContent clientSiteId={clientSiteId} productId={productId} password={password} />
      )}
    </AdminLayout>
  );
}
