import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../../config";
import type { SiteContent } from "../../hooks/useContent";
import { adminFetch } from "../../hooks/useAdminSession";
import { IconPhone, IconPin } from "../../components/admin/icons";

type EstablishmentSectionProps = {
  clientSiteId: string;
  password: string;
};

type PlaceResult = {
  placeId: string;
  name: string;
  address: string;
};

type EstablishmentImage = {
  id: string;
  path: string;
  sortOrder: number;
};

const inputClass =
  "rounded-button border border-border-subtle bg-white px-3 py-2 text-navy placeholder:text-gray-text/60 focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20";

const SEARCH_DEBOUNCE_MS = 400;

function EstablishmentPreview({
  clientSiteId,
  password,
  name,
  type,
  address,
  phone,
  images,
  onImagesChanged,
}: {
  clientSiteId: string;
  password: string;
  name: string;
  type: string;
  address: string;
  phone: string;
  images: EstablishmentImage[];
  onImagesChanged: () => void;
}) {
  const cover = images[0];

  const handleUpload = async (file: File) => {
    const body = new FormData();
    body.append("file", file);
    await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/establishment/images`, password, {
      method: "POST",
      body,
    });
    onImagesChanged();
  };

  const handleDelete = async (imageId: string) => {
    await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/establishment/images/${imageId}`, password, {
      method: "DELETE",
    });
    onImagesChanged();
  };

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

      <div className="flex flex-col gap-2 p-5">
        <span className="text-lg font-bold text-navy">{name || "Nom de l'établissement"}</span>
        {type && (
          <span className="w-fit rounded-pill bg-green-accent/15 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-green-accent">
            {type}
          </span>
        )}
        {address && (
          <div className="flex items-start gap-2 text-sm text-gray-text">
            <IconPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-text/60" />
            <span>{address}</span>
          </div>
        )}
        {phone && (
          <div className="flex items-center gap-2 text-sm text-gray-text">
            <IconPhone className="h-4 w-4 shrink-0 text-gray-text/60" />
            <span>{phone}</span>
          </div>
        )}
        {!address && !phone && (
          <p className="text-sm text-gray-text/60">Remplis le formulaire pour voir l'aperçu prendre vie.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border-subtle p-4">
        {images.map((image) => (
          <div key={image.id} className="relative">
            <img src={`${API_BASE_URL}${image.path}`} alt="" className="h-16 w-16 rounded-button object-cover" />
            <button
              type="button"
              onClick={() => handleDelete(image.id)}
              className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full bg-red-500 text-xs text-white"
            >
              ×
            </button>
          </div>
        ))}
        <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-button border border-dashed border-border-subtle text-xs text-gray-text hover:border-brand-mid">
          + Photo
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>
    </aside>
  );
}

export default function EstablishmentSection({ clientSiteId, password }: EstablishmentSectionProps) {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [establishmentName, setEstablishmentName] = useState("");
  const [establishmentType, setEstablishmentType] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [images, setImages] = useState<EstablishmentImage[]>([]);

  const [suggestions, setSuggestions] = useState<PlaceResult[]>([]);
  const [inputFocused, setInputFocused] = useState(false);
  const [searchStatus, setSearchStatus] = useState<"idle" | "searching" | "error">("idle");
  const [searchError, setSearchError] = useState<string | null>(null);

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Évite qu'un `setEstablishmentName` déclenché par le chargement initial ou par la sélection
  // d'une suggestion ne relance une recherche — seule une frappe utilisateur (onChange du champ)
  // doit déclencher l'autocomplete.
  const userEditedName = useRef(false);
  const latestQueryRef = useRef("");

  const loadImages = () =>
    fetch(`${API_BASE_URL}/api/t/${clientSiteId}/establishment/images`)
      .then((res) => res.json())
      .then(setImages);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/t/${clientSiteId}/content`)
      .then((res) => res.json())
      .then((data: SiteContent) => {
        setContent(data);
        setEstablishmentName(data.establishmentName);
        setEstablishmentType(data.establishmentType);
        setAddress(data.address);
        setPhone(data.phone);
      });
    loadImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!userEditedName.current) return;

    const query = establishmentName.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setSearchStatus("idle");
      return;
    }

    const timeout = setTimeout(async () => {
      latestQueryRef.current = query;
      setSearchStatus("searching");
      setSearchError(null);

      const res = await adminFetch(
        API_BASE_URL,
        `/api/t/${clientSiteId}/admin/google-places/search?query=${encodeURIComponent(query)}`,
        password
      );
      const data = await res.json();

      // Une frappe plus récente a déjà relancé une autre recherche entre-temps — ignore cette
      // réponse devenue obsolète pour ne pas écraser des suggestions plus fraîches.
      if (latestQueryRef.current !== query) return;

      if (!res.ok) {
        setSearchStatus("error");
        setSearchError(data.error ?? "Recherche indisponible.");
        setSuggestions([]);
        return;
      }

      setSearchStatus("idle");
      setSuggestions(data as PlaceResult[]);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establishmentName]);

  const handleSelect = async (placeId: string) => {
    setSuggestions([]);
    const res = await adminFetch(
      API_BASE_URL,
      `/api/t/${clientSiteId}/admin/google-places/details?placeId=${encodeURIComponent(placeId)}`,
      password
    );
    const data = await res.json();

    if (!res.ok) {
      setSearchStatus("error");
      setSearchError(data.error ?? "Impossible de récupérer la fiche.");
      return;
    }

    userEditedName.current = false;
    if (data.name) setEstablishmentName(data.name);
    if (data.address) setAddress(data.address);
    if (data.phone) setPhone(data.phone);
    if (data.type) setEstablishmentType(data.type);
  };

  const handleSave = async () => {
    if (!content) return;
    setSaveStatus("saving");
    const res = await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/content`, password, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteName: content.siteName,
        description: content.description,
        offers: content.offers.map(({ title, price, description }) => ({ title, price, description })),
        establishmentName,
        establishmentType,
        address,
        phone,
      }),
    });
    setSaveStatus(res.ok ? "saved" : "error");
  };

  if (!content) return <p className="text-gray-text">Chargement…</p>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold text-navy">Établissement</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <section className="rounded-card bg-white p-8 shadow-card">
            <p className="mb-4 text-sm text-gray-text">
              Infos factuelles de l'établissement — partagées entre modules (ex. Maps utilise l'adresse
              renseignée ici).
            </p>

            <div className="flex flex-col gap-3">
              <label className="relative flex flex-col gap-1 text-sm font-medium text-gray-text">
                Nom de l'établissement
                <input
                  className={inputClass}
                  value={establishmentName}
                  onChange={(e) => {
                    userEditedName.current = true;
                    setEstablishmentName(e.target.value);
                  }}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setTimeout(() => setInputFocused(false), 150)}
                  placeholder="Boulangerie Dupont"
                  autoComplete="off"
                />
                {searchStatus === "searching" && (
                  <span className="absolute right-3 top-9 text-xs text-gray-text/60">Recherche…</span>
                )}

                {inputFocused && suggestions.length > 0 && (
                  <ul className="absolute left-0 right-0 top-full z-10 mt-1 flex flex-col gap-0.5 rounded-button border border-border-subtle bg-white p-1.5 shadow-soft">
                    {suggestions.map((r) => (
                      <li key={r.placeId}>
                        <button
                          type="button"
                          onClick={() => handleSelect(r.placeId)}
                          className="w-full rounded-button px-2 py-1.5 text-left text-sm hover:bg-bg-page-start"
                        >
                          <span className="block font-medium text-navy">{r.name}</span>
                          <span className="block text-xs text-gray-text">{r.address}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </label>

              {searchStatus === "error" && searchError && <p className="text-sm text-red-500">{searchError}</p>}

              <label className="text-sm font-medium text-gray-text">
                Type d'établissement
                <input
                  className={`mt-1 w-full ${inputClass}`}
                  value={establishmentType}
                  onChange={(e) => setEstablishmentType(e.target.value)}
                  placeholder="bakery"
                />
              </label>
              <label className="text-sm font-medium text-gray-text">
                Adresse
                <input
                  className={`mt-1 w-full ${inputClass}`}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="12 rue de la Paix, 75002 Paris"
                />
              </label>
              <label className="text-sm font-medium text-gray-text">
                Téléphone
                <input
                  className={`mt-1 w-full ${inputClass}`}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+33 1 23 45 67 89"
                />
              </label>
            </div>
          </section>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saveStatus === "saving"}
              className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              Enregistrer
            </button>
            {saveStatus === "saved" && <p className="text-green-accent">Établissement enregistré.</p>}
            {saveStatus === "error" && <p className="text-red-500">Erreur lors de l'enregistrement.</p>}
          </div>
        </div>

        <EstablishmentPreview
          clientSiteId={clientSiteId}
          password={password}
          name={establishmentName}
          type={establishmentType}
          address={address}
          phone={phone}
          images={images}
          onImagesChanged={loadImages}
        />
      </div>
    </div>
  );
}
