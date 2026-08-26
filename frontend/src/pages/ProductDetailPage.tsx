import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";
import { useAdminSession, adminFetch } from "../hooks/useAdminSession";
import { useModules } from "../hooks/useModules";
import AdminLoginScreen from "../components/admin/AdminLoginScreen";
import AdminLayout from "../components/admin/AdminLayout";
import Select from "../components/admin/Select";

type ProductImage = {
  id: string;
  path: string;
  sortOrder: number;
};

type ProductSize = {
  id: string;
  label: string;
  stock: number;
  sortOrder: number;
};

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  images: ProductImage[];
  sizes: ProductSize[];
  collectionId: string | null;
  highlighted: boolean;
};

type Collection = {
  id: string;
  name: string;
};

type ProductForm = {
  name: string;
  description: string;
  price: string;
  stock: string;
  collectionId: string;
  highlighted: boolean;
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
    collectionId: product.collectionId ?? "",
    highlighted: product.highlighted,
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

type ProductReview = {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  selected: boolean;
  createdAt: string;
};

// Même composant que frontend/src/pages/admin/AvisGoogleSection.tsx (ToggleSwitch) — le client
// choisit quels avis (soumis publiquement, sans vérification d'achat en V1) sont affichés sur le site.
function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div className="h-6 w-11 rounded-full bg-border-subtle transition-colors duration-200 peer-checked:bg-green-accent" />
      <div className="absolute left-1 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 peer-checked:translate-x-5" />
    </label>
  );
}

function Stars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <span className="text-amber-400">
      {"★".repeat(rounded)}
      <span className="text-border-subtle">{"★".repeat(5 - rounded)}</span>
    </span>
  );
}

function ReviewsSection({ clientSiteId, productId, password }: { clientSiteId: string; productId: string; password: string }) {
  const [reviews, setReviews] = useState<ProductReview[] | null>(null);

  const load = () =>
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/catalogue/products/${productId}/reviews`, password)
      .then((res) => res.json())
      .then(setReviews);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleReview = async (id: string, selected: boolean) => {
    setReviews((current) => current?.map((r) => (r.id === id ? { ...r, selected } : r)) ?? current);
    await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/catalogue/reviews/${id}`, password, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selected }),
    });
  };

  const handleDelete = async (id: string) => {
    await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/catalogue/reviews/${id}`, password, { method: "DELETE" });
    load();
  };

  return (
    <section className="rounded-card bg-white p-8 shadow-card">
      <h2 className="mb-1 text-lg font-bold text-navy">Avis</h2>
      <p className="mb-4 text-sm text-gray-text">
        Soumis librement par les visiteurs (pas de vérification d'achat) — choisis lesquels afficher sur la fiche
        produit.
      </p>

      {!reviews ? (
        <p className="text-sm text-gray-text">Chargement…</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-gray-text">Aucun avis pour l'instant.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((review) => (
            <div key={review.id} className="flex items-start justify-between gap-4 rounded-button bg-bg-page-start/60 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-navy">{review.authorName}</span>
                  <Stars rating={review.rating} />
                </div>
                <p className="mt-1 text-sm text-gray-text">{review.comment}</p>
                <span className="mt-1 block text-xs text-gray-text/70">
                  {new Date(review.createdAt).toLocaleDateString("fr-FR")}
                </span>
              </div>
              <div className="flex shrink-0 flex-col items-center gap-2">
                <div className="flex flex-col items-center gap-1">
                  <ToggleSwitch checked={review.selected} onChange={(value) => toggleReview(review.id, value)} />
                  <span className="text-[11px] text-gray-text">{review.selected ? "Affiché" : "Masqué"}</span>
                </div>
                <button type="button" onClick={() => handleDelete(review.id)} className="text-xs text-red-500 hover:text-red-600">
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const AI_PROMPT_VARIANTS = [
  {
    id: "main" as const,
    label: "Photo principale",
    suffix: "Vue de face, présentation claire et centrée du produit.",
  },
  {
    id: "hover" as const,
    label: "Photo au survol",
    suffix:
      "Angle ou détail différent de la vue principale (autre côté, gros plan sur une texture ou une finition), pour varier l'affichage au survol sur la boutique.",
  },
  {
    id: "slider1" as const,
    label: "Photo slider 1",
    suffix:
      "Vue supplémentaire du produit sous un angle différent des deux précédentes (de dos ou de profil, ou en situation), pour enrichir le slider de la fiche produit.",
  },
  {
    id: "slider2" as const,
    label: "Photo slider 2",
    suffix:
      "Autre vue complémentaire (gros plan sur un détail distinct, une finition ou une matière), pour compléter le slider de la fiche produit.",
  },
];

// Pas de génération d'image côté serveur (service tiers payant, à valider explicitement — voir
// CLAUDE.md règle 5) : on se contente de composer un prompt texte à partir des infos déjà saisies,
// que l'utilisateur colle lui-même dans l'outil IA de son choix (ChatGPT, Midjourney...) puis
// enregistre le résultat dans la section Photos ci-dessous.
function AiPromptSection({ name, description }: { name: string; description: string }) {
  const [copied, setCopied] = useState<string | null>(null);

  const base = `Photographie de produit en studio pour "${name.trim() || "ce produit"}"${
    description.trim() ? ` : ${description.trim()}` : ""
  }. Fond neutre uni, éclairage doux et homogène, mise au point nette sur le produit, style épuré et professionnel, cadrage vertical (format portrait 3:4).`;

  const copyPrompt = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied((current) => (current === id ? null : current)), 1500);
  };

  return (
    <section className="rounded-card bg-white p-8 shadow-card">
      <h2 className="mb-1 text-lg font-bold text-navy">Prompt IA</h2>
      <p className="mb-4 text-sm text-gray-text">
        Copie un prompt, colle-le dans un outil de génération d'images (ChatGPT, Midjourney…), puis
        enregistre l'image obtenue dans la section Photos ci-dessous.
      </p>
      <div className="flex flex-col gap-3">
        {AI_PROMPT_VARIANTS.map((variant) => {
          const prompt = `${base} ${variant.suffix}`;
          return (
            <div key={variant.id} className="rounded-button border border-border-subtle bg-bg-page-start/60 p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-text">{variant.label}</span>
                <button
                  type="button"
                  onClick={() => copyPrompt(variant.id, prompt)}
                  className={`shrink-0 rounded-button border px-3 py-1 text-xs font-medium transition-colors ${
                    copied === variant.id
                      ? "border-green-accent bg-green-accent/10 text-green-accent"
                      : "border-border-subtle bg-white text-navy hover:bg-bg-page-start"
                  }`}
                >
                  {copied === variant.id ? "Copié !" : "Copier"}
                </button>
              </div>
              <p className="text-sm leading-relaxed text-gray-text">{prompt}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Facultatif — voir ProductSize.cs côté backend. Dès qu'une taille existe, le stock global du
// produit (champ "Stock" de la section Informations) n'est plus utilisé côté vente : chaque taille
// a le sien. Pas de réordonnancement (contrairement aux photos) — ordre de création simple.
function SizesSection({
  sizes,
  onAdd,
  onUpdateStock,
  onDelete,
}: {
  sizes: ProductSize[];
  onAdd: (label: string, stock: number) => void;
  onUpdateStock: (size: ProductSize, stock: number) => void;
  onDelete: (sizeId: string) => void;
}) {
  const [label, setLabel] = useState("");
  const [stock, setStock] = useState("");

  const handleAdd = () => {
    if (!label.trim()) return;
    onAdd(label.trim(), Number(stock) || 0);
    setLabel("");
    setStock("");
  };

  return (
    <section className="rounded-card bg-white p-8 shadow-card">
      <h2 className="mb-1 text-lg font-bold text-navy">Tailles</h2>
      <p className="mb-4 text-sm text-gray-text">
        Facultatif — dès qu'une taille est ajoutée, le client doit en choisir une pour acheter ce produit, et le
        champ "Stock" ci-dessus n'est plus utilisé (chaque taille a le sien).
      </p>

      {sizes.length > 0 && (
        <div className="mb-4 flex flex-col gap-2">
          {sizes.map((size) => (
            <div key={size.id} className="flex items-center gap-3 rounded-button border border-border-subtle p-3">
              <span className="w-16 shrink-0 font-medium text-navy">{size.label}</span>
              <input
                type="number"
                min={0}
                className={`${inputClass} w-24`}
                value={size.stock}
                onChange={(e) => onUpdateStock(size, Math.max(0, Number(e.target.value) || 0))}
              />
              <span className="text-xs text-gray-text">en stock</span>
              <button type="button" onClick={() => onDelete(size.id)} className="ml-auto text-sm text-red-500 hover:text-red-600">
                Supprimer
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          className={`${inputClass} w-28`}
          placeholder="Taille (ex. M)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <input
          className={`${inputClass} w-24`}
          type="number"
          min={0}
          placeholder="Stock"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!label.trim()}
          className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Ajouter
        </button>
      </div>
    </section>
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
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);

  const load = () =>
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/catalogue/products/${productId}`, password)
      .then((res) => res.json())
      .then((data: Product) => {
        setProduct(data);
        setForm(toForm(data));
      });

  useEffect(() => {
    load();
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/catalogue/collections`, password)
      .then((res) => res.json())
      .then(setCollections);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDirty = Boolean(
    product &&
      form &&
      (form.name !== product.name ||
        form.description !== product.description ||
        form.price !== String(product.price) ||
        form.stock !== String(product.stock) ||
        form.collectionId !== (product.collectionId ?? "") ||
        form.highlighted !== product.highlighted)
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
        collectionId: form.collectionId || null,
        highlighted: form.highlighted,
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

  // Glisser-déposer natif (pas de librairie, cf. CLAUDE.md règle 5) : `imageIds` est l'ordre complet
  // voulu, le backend réécrit SortOrder d'après la position dans le tableau (voir
  // CatalogueAdminEndpoints.cs, endpoint /images/reorder).
  const handleReorderImages = async (imageIds: string[]) => {
    await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/catalogue/products/${productId}/images/reorder`, password, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageIds }),
    });
    load();
  };

  const handleAddSize = async (label: string, stock: number) => {
    await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/catalogue/products/${productId}/sizes`, password, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, stock }),
    });
    load();
  };

  const handleUpdateSizeStock = async (size: ProductSize, stock: number) => {
    setProduct((current) =>
      current ? { ...current, sizes: current.sizes.map((s) => (s.id === size.id ? { ...s, stock } : s)) } : current
    );
    await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/catalogue/sizes/${size.id}`, password, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: size.label, stock }),
    });
  };

  const handleDeleteSize = async (sizeId: string) => {
    await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/catalogue/sizes/${sizeId}`, password, {
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
                <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-gray-text">
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
                <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-gray-text">
                  Stock
                  <input
                    className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
                    type="number"
                    min={0}
                    disabled={product.sizes.length > 0}
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  />
                  {product.sizes.length > 0 && (
                    <span className="text-xs text-gray-text/80">Géré par taille ci-dessous, ce champ n'est plus utilisé.</span>
                  )}
                </label>
              </div>
              <label className="flex flex-col gap-1 text-sm text-gray-text">
                Collection
                <Select
                  className={inputClass}
                  value={form.collectionId}
                  onChange={(collectionId) => setForm({ ...form, collectionId })}
                  options={[{ value: "", label: "Aucune" }, ...collections.map((c) => ({ value: c.id, label: c.name }))]}
                />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-button bg-bg-page-start/60 p-3">
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-navy">Mis en avant</span>
                  <span className="text-xs text-gray-text">Affiché en priorité sur la page d'accueil du site.</span>
                </span>
                <ToggleSwitch checked={form.highlighted} onChange={(value) => setForm({ ...form, highlighted: value })} />
              </label>
            </div>
          </section>

          <SizesSection
            sizes={product.sizes}
            onAdd={handleAddSize}
            onUpdateStock={handleUpdateSizeStock}
            onDelete={handleDeleteSize}
          />

          {product.images.length < 4 && <AiPromptSection name={form.name} description={form.description} />}

          <section className="rounded-card bg-white p-8 shadow-card">
            <h2 className="mb-1 text-lg font-bold text-navy">Photos</h2>
            <p className="mb-4 text-sm text-gray-text">
              L'ordre compte : la <strong>1ʳᵉ photo</strong> est celle affichée par défaut sur la boutique, la{" "}
              <strong>2ᵉ photo</strong> s'affiche au survol de la carte produit (sur les templates qui le prennent en
              charge, ex. Charis), et les photos suivantes apparaissent dans le slider de la fiche produit.
              Glisse-dépose une photo pour changer son ordre.
            </p>
            <div className="flex flex-wrap gap-3">
              {product.images.map((image, index) => (
                <div
                  key={image.id}
                  draggable
                  onDragStart={() => setDraggedImageId(image.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!draggedImageId || draggedImageId === image.id) return;
                    const ids = product.images.map((img) => img.id);
                    const from = ids.indexOf(draggedImageId);
                    const to = ids.indexOf(image.id);
                    ids.splice(to, 0, ids.splice(from, 1)[0]);
                    setDraggedImageId(null);
                    handleReorderImages(ids);
                  }}
                  onDragEnd={() => setDraggedImageId(null)}
                  className={`relative flex cursor-grab flex-col items-center gap-1 active:cursor-grabbing ${
                    draggedImageId === image.id ? "opacity-40" : ""
                  }`}
                  title="Glisser pour réordonner"
                >
                  <div className="relative">
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
                  {index === 0 && (
                    <span className="rounded-pill bg-brand-mid/10 px-2 py-0.5 text-[10px] font-semibold text-brand-mid">
                      Photo principale
                    </span>
                  )}
                  {index === 1 && (
                    <span className="rounded-pill bg-green-accent/10 px-2 py-0.5 text-[10px] font-semibold text-green-accent">
                      Photo au survol
                    </span>
                  )}
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

          <ReviewsSection clientSiteId={clientSiteId} productId={productId} password={password} />
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
    <AdminLayout clientSiteId={clientSiteId} activeSection="products" password={password}>
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
