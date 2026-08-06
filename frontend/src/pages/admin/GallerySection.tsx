import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import { adminFetch } from "../../hooks/useAdminSession";

type GallerySectionProps = {
  clientSiteId: string;
  password: string;
};

type GalleryImage = {
  id: string;
  path: string;
  sortOrder: number;
};

// Même pattern que l'onglet Photos d'EstablishmentSection.tsx (upload/suppression immédiats, pas de
// bouton "Enregistrer" séparé) — mais sans plafond de 3 photos, et propre à ce module.
export default function GallerySection({ clientSiteId, password }: GallerySectionProps) {
  const [images, setImages] = useState<GalleryImage[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/galerie/images`, password)
      .then((res) => res.json())
      .then(setImages);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    const body = new FormData();
    body.append("file", file);
    const res = await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/galerie/images`, password, {
      method: "POST",
      body,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Envoi impossible.");
    }
    setUploading(false);
    load();
  };

  const handleDelete = async (imageId: string) => {
    await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/galerie/images/${imageId}`, password, {
      method: "DELETE",
    });
    load();
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-navy">Galerie</h1>
        <p className="text-sm text-gray-text">
          Photos affichées sur le site public, sans limite de nombre — utile pour montrer des réalisations,
          l'intérieur d'un local, des produits en situation...
        </p>
      </div>

      <section className="rounded-card bg-white p-6 shadow-card">
        {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
        {!images ? (
          <p className="text-gray-text">Chargement…</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {images.map((image) => (
              <div key={image.id} className="relative">
                <img src={`${API_BASE_URL}${image.path}`} alt="" className="h-32 w-32 rounded-button object-cover" />
                <button
                  type="button"
                  onClick={() => handleDelete(image.id)}
                  className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full bg-red-500 text-xs text-white"
                  aria-label="Supprimer la photo"
                >
                  ×
                </button>
              </div>
            ))}
            <label className="flex h-32 w-32 cursor-pointer items-center justify-center rounded-button border border-dashed border-border-subtle text-xs text-gray-text hover:border-brand-mid">
              {uploading ? "Envoi…" : "+ Photo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        )}
      </section>
    </div>
  );
}
