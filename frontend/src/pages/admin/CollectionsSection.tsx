import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import { adminFetch } from "../../hooks/useAdminSession";
import ConfirmModal from "../../components/admin/ConfirmModal";

type Collection = {
  id: string;
  name: string;
  sortOrder: number;
};

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  collectionId: string | null;
  highlighted: boolean;
};

type CollectionsSectionProps = {
  clientSiteId: string;
  password: string;
};

const inputClass =
  "rounded-button border border-border-subtle bg-white px-3 py-2 text-navy placeholder:text-gray-text/60 focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20";

// Renommage en place : le nom devient un champ texte au clic, enregistré au blur (Entrée aussi) —
// pas de bouton "Modifier" séparé, la liste reste aussi simple qu'une liste de produits.
// La liste de produits (case à cocher pour ajouter/retirer) est repliée par défaut, sur le même
// principe que la grille "Modules autorisés" de SitesSection.tsx.
function CollectionRow({
  collection,
  products,
  expanded,
  dragging,
  onToggleExpand,
  onRename,
  onDelete,
  onToggleProduct,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  collection: Collection;
  products: Product[];
  expanded: boolean;
  dragging: boolean;
  onToggleExpand: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (collection: Collection) => void;
  onToggleProduct: (product: Product, collectionId: string | null) => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(collection.name);
  const memberCount = products.filter((p) => p.collectionId === collection.id).length;

  const commit = () => {
    setEditing(false);
    const trimmed = name.trim();
    if (trimmed && trimmed !== collection.name) onRename(collection.id, trimmed);
    else setName(collection.name);
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`flex flex-col gap-3 rounded-button bg-bg-page-start/60 p-4 ${dragging ? "opacity-40" : ""}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className="cursor-grab select-none text-gray-text/60 active:cursor-grabbing"
          title="Glisser pour réordonner"
        >
          ⠿
        </span>
        {editing ? (
          <input
            className={inputClass}
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && commit()}
          />
        ) : (
          <button type="button" onClick={onToggleExpand} className="flex flex-1 items-baseline gap-2 text-left">
            <span className="font-medium text-navy">{collection.name}</span>
            <span className="text-sm text-gray-text">
              {memberCount} produit{memberCount > 1 ? "s" : ""} {expanded ? "▲" : "▼"}
            </span>
          </button>
        )}
        <div className="flex shrink-0 items-center gap-3">
          <button type="button" onClick={() => setEditing(true)} className="text-sm font-medium text-brand-mid hover:text-brand-start">
            Renommer
          </button>
          <button type="button" onClick={() => onDelete(collection)} className="text-sm text-red-500 hover:text-red-600">
            Supprimer
          </button>
        </div>
      </div>

      {expanded && (
        <div className="grid grid-cols-2 gap-2 border-t border-border-subtle pt-3 sm:grid-cols-3">
          {products.length === 0 ? (
            <p className="text-sm text-gray-text">Aucun produit pour l'instant.</p>
          ) : (
            products.map((product) => {
              const checked = product.collectionId === collection.id;
              return (
                <label
                  key={product.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-button border p-2 text-sm transition-colors ${
                    checked ? "border-brand-mid bg-brand-mid/5 text-navy" : "border-border-subtle text-gray-text hover:bg-bg-page-start"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleProduct(product, checked ? null : collection.id)}
                    className="sr-only"
                  />
                  <span className="truncate">{product.name}</span>
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function CollectionsSection({ clientSiteId, password }: CollectionsSectionProps) {
  const [collections, setCollections] = useState<Collection[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Collection | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const load = () =>
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/catalogue/collections`, password)
      .then((res) => res.json())
      .then(setCollections);

  useEffect(() => {
    load();
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/catalogue/products`, password)
      .then((res) => res.json())
      .then(setProducts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleProduct = async (product: Product, collectionId: string | null) => {
    setProducts((current) => current?.map((p) => (p.id === product.id ? { ...p, collectionId } : p)) ?? current);
    await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/catalogue/products/${product.id}`, password, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock,
        collectionId,
        highlighted: product.highlighted,
      }),
    });
  };

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setCreating(true);
    await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/catalogue/collections`, password, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    setNewName("");
    setCreating(false);
    load();
  };

  const handleRename = async (id: string, name: string) => {
    setCollections((current) => current?.map((c) => (c.id === id ? { ...c, name } : c)) ?? current);
    await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/catalogue/collections/${id}`, password, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  };

  // Glisser-déposer natif (même patron que les photos produit, voir ProductDetailPage.tsx) :
  // `collectionIds` est l'ordre complet voulu, le backend réécrit SortOrder d'après la position
  // (voir CatalogueAdminEndpoints.cs, endpoint /collections/reorder).
  const handleReorder = async (collectionIds: string[]) => {
    setCollections((current) => {
      if (!current) return current;
      const byId = new Map(current.map((c) => [c.id, c]));
      return collectionIds.map((id) => byId.get(id)!).filter(Boolean);
    });
    await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/catalogue/collections/reorder`, password, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collectionIds }),
    });
  };

  const handleDelete = async (id: string) => {
    await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/catalogue/collections/${id}`, password, {
      method: "DELETE",
    });
    setToDelete(null);
    load();
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-navy">Collections</h1>
        <p className="text-sm text-gray-text">
          Regroupe tes produits (ex. "Été 2026", "Accessoires") pour permettre à tes visiteurs de filtrer la boutique.
          Un produit appartient à une seule collection à la fois — coche/décoche directement ci-dessous, ou choisis-la
          depuis la fiche du produit.
        </p>
      </div>

      <section className="rounded-card bg-white p-6 shadow-card">
        <div className="flex gap-2">
          <input
            className={`${inputClass} flex-1`}
            placeholder="Nom de la collection"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Ajouter
          </button>
        </div>
      </section>

      {!collections ? (
        <p className="text-gray-text">Chargement…</p>
      ) : collections.length === 0 ? (
        <section className="rounded-card bg-white p-8 shadow-card">
          <p className="text-gray-text">Aucune collection pour l'instant.</p>
        </section>
      ) : (
        <section className="flex flex-col gap-3 rounded-card bg-white p-6 shadow-card">
          {collections.map((collection) => (
            <CollectionRow
              key={collection.id}
              collection={collection}
              products={products ?? []}
              expanded={expandedId === collection.id}
              dragging={draggedId === collection.id}
              onToggleExpand={() => setExpandedId((current) => (current === collection.id ? null : collection.id))}
              onRename={handleRename}
              onDelete={setToDelete}
              onToggleProduct={handleToggleProduct}
              onDragStart={() => setDraggedId(collection.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (!draggedId || draggedId === collection.id) return;
                const ids = collections.map((c) => c.id);
                const from = ids.indexOf(draggedId);
                const to = ids.indexOf(collection.id);
                ids.splice(to, 0, ids.splice(from, 1)[0]);
                setDraggedId(null);
                handleReorder(ids);
              }}
              onDragEnd={() => setDraggedId(null)}
            />
          ))}
        </section>
      )}

      {toDelete && (
        <ConfirmModal
          title={`Supprimer "${toDelete.name}" ?`}
          message="Les produits de cette collection ne seront pas supprimés, ils n'auront simplement plus de collection."
          onConfirm={() => handleDelete(toDelete.id)}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
