import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../../config";
import type { DayHours, SiteContent } from "../../hooks/useContent";
import { adminFetch } from "../../hooks/useAdminSession";
import { useModules } from "../../hooks/useModules";
import { IconClock, IconMail, IconPhone, IconPin } from "../../components/admin/icons";

type EstablishmentSectionProps = {
  clientSiteId: string;
  password: string;
};

type PlaceResult = {
  placeId: string;
  name: string;
  address: string;
};

type PlaceDetails = {
  name: string;
  address: string;
  phone: string;
  type: string;
  openingHours: DayHours[] | null;
  photoReferences: string[];
};

type EstablishmentImage = {
  id: string;
  path: string;
  sortOrder: number;
};

const WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

const TABS = [
  { id: "info", label: "Informations" },
  { id: "photos", label: "Photos" },
  { id: "hours", label: "Horaires" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const inputClass =
  "rounded-button border border-border-subtle bg-white px-3 py-2 text-navy placeholder:text-gray-text/60 focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20";

const SEARCH_DEBOUNCE_MS = 400;

const emptyDayHours = (): DayHours => ({
  closed: true,
  morningOpen: "",
  morningClose: "",
  afternoonOpen: "",
  afternoonClose: "",
});

// Même valeur que la colonne SiteContent.OpeningHours côté back (voir ContentEndpoints.ToResponse) :
// tant qu'aucune recherche Google n'a rempli les horaires, on travaille sur 7 jours "fermé" plutôt
// qu'un tableau vide, pour que les inputs de l'onglet Horaires soient toujours affichés.
const normalizeHours = (hours: DayHours[]) => (hours.length > 0 ? hours : WEEKDAYS.map(() => emptyDayHours()));

const hoursEqual = (a: DayHours[], b: DayHours[]) =>
  a.length === b.length &&
  a.every(
    (d, i) =>
      d.closed === b[i].closed &&
      d.morningOpen === b[i].morningOpen &&
      d.morningClose === b[i].morningClose &&
      d.afternoonOpen === b[i].afternoonOpen &&
      d.afternoonClose === b[i].afternoonClose
  );

function EstablishmentPreview({
  name,
  type,
  address,
  phone,
  email,
  cover,
}: {
  name: string;
  type: string;
  address: string;
  phone: string;
  email: string;
  cover?: EstablishmentImage;
}) {
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
        <span className="text-2xl font-bold text-navy">{name || "Nom de l'établissement"}</span>
        {type && (
          <span className="w-fit rounded-pill bg-green-accent/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-green-accent">
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
        {email && (
          <div className="flex items-center gap-2 text-sm text-gray-text">
            <IconMail className="h-4 w-4 shrink-0 text-gray-text/60" />
            <span>{email}</span>
          </div>
        )}
        {!address && !phone && !email && (
          <p className="text-sm text-gray-text/60">Remplis le formulaire pour voir l'aperçu prendre vie.</p>
        )}
      </div>
    </aside>
  );
}

function PhotosTab({
  clientSiteId,
  password,
  images,
  onImagesChanged,
  importing,
}: {
  clientSiteId: string;
  password: string;
  images: EstablishmentImage[];
  onImagesChanged: () => void;
  importing: boolean;
}) {
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
    <section className="rounded-card bg-white p-8 shadow-card">
      <p className="mb-4 text-sm text-gray-text">
        Photos affichées sur le site public. Une recherche Google (onglet Informations) importe
        automatiquement les 3 premières disponibles ; tu peux aussi en ajouter ou en supprimer ici.
      </p>
      {importing && <p className="mb-4 text-sm text-brand-mid">Import des photos Google en cours…</p>}
      <div className="flex flex-wrap gap-3">
        {images.map((image) => (
          <div key={image.id} className="relative">
            <img src={`${API_BASE_URL}${image.path}`} alt="" className="h-28 w-28 rounded-button object-cover" />
            <button
              type="button"
              onClick={() => handleDelete(image.id)}
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
              if (file) handleUpload(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>
    </section>
  );
}

const timeInputClass = `${inputClass} w-[110px] min-w-0 disabled:cursor-not-allowed disabled:opacity-40`;

function HoursTab({
  hours,
  onChange,
}: {
  hours: DayHours[];
  onChange: (index: number, patch: Partial<DayHours>) => void;
}) {
  return (
    <section className="rounded-card bg-white p-8 shadow-card">
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-text">
        <IconClock className="h-4 w-4 shrink-0 text-gray-text/60" />
        <p>
          Récupérées automatiquement lors d'une recherche Google (onglet Informations), modifiables
          ici. Laisse la plage "Après-midi" vide s'il n'y a pas de coupure entre midi et deux.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {WEEKDAYS.map((day, index) => {
          const d = hours[index] ?? emptyDayHours();
          return (
            <div
              key={day}
              // flex-wrap plutôt qu'une grid à colonnes fixes : sur une fenêtre étroite, les inputs
              // "time" (largeur intrinsèque non compressible) passent à la ligne au lieu de forcer
              // toute la page à défiler horizontalement (voir docs/05-roadmap-poc.md, bug largeur Horaires).
              className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border-subtle pb-3 last:border-0 last:pb-0"
            >
              <span className="w-24 shrink-0 text-sm font-semibold text-navy">{day}</span>
              <label className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-gray-text">
                <input
                  type="checkbox"
                  checked={d.closed}
                  onChange={(e) => onChange(index, { closed: e.target.checked })}
                  className="h-4 w-4 accent-brand-mid"
                />
                Fermé
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="w-12 shrink-0 text-xs text-gray-text">Matin</span>
                <input
                  type="time"
                  disabled={d.closed}
                  value={d.morningOpen}
                  onChange={(e) => onChange(index, { morningOpen: e.target.value })}
                  className={timeInputClass}
                />
                <span className="text-gray-text/60">–</span>
                <input
                  type="time"
                  disabled={d.closed}
                  value={d.morningClose}
                  onChange={(e) => onChange(index, { morningClose: e.target.value })}
                  className={timeInputClass}
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="w-16 shrink-0 text-xs text-gray-text">Après-midi</span>
                <input
                  type="time"
                  disabled={d.closed}
                  value={d.afternoonOpen}
                  onChange={(e) => onChange(index, { afternoonOpen: e.target.value })}
                  className={timeInputClass}
                />
                <span className="text-gray-text/60">–</span>
                <input
                  type="time"
                  disabled={d.closed}
                  value={d.afternoonClose}
                  onChange={(e) => onChange(index, { afternoonClose: e.target.value })}
                  className={timeInputClass}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function EstablishmentSection({ clientSiteId, password }: EstablishmentSectionProps) {
  const modules = useModules(clientSiteId);
  const hoursModuleEnabled = Boolean(modules?.horaires?.enabled);
  // "modules === null" (pas encore chargé) laisse l'onglet visible un court instant plutôt que de
  // le faire disparaître puis réapparaître — mêmes règles que CATALOGUE_SECTIONS (AdminLayout.tsx).
  const visibleTabs = TABS.filter((tab) => tab.id !== "hours" || modules === null || hoursModuleEnabled);

  const [activeTab, setActiveTab] = useState<TabId>("info");

  // Si le module Horaires est désactivé pendant que cet onglet est ouvert (ou à la navigation
  // directe), on retombe sur Informations plutôt que d'afficher un onglet devenu invisible.
  useEffect(() => {
    if (activeTab === "hours" && modules !== null && !hoursModuleEnabled) setActiveTab("info");
  }, [activeTab, modules, hoursModuleEnabled]);

  const [content, setContent] = useState<SiteContent | null>(null);
  const [establishmentName, setEstablishmentName] = useState("");
  const [establishmentType, setEstablishmentType] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [managerName, setManagerName] = useState("");
  const [managerPhone, setManagerPhone] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [googlePlaceId, setGooglePlaceId] = useState("");
  const [googlePlaceName, setGooglePlaceName] = useState("");
  const [openingHours, setOpeningHours] = useState<DayHours[]>(WEEKDAYS.map(() => emptyDayHours()));
  const [images, setImages] = useState<EstablishmentImage[]>([]);
  const [importingPhotos, setImportingPhotos] = useState(false);

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
        setEmail(data.email);
        setManagerName(data.managerName);
        setManagerPhone(data.managerPhone);
        setManagerEmail(data.managerEmail);
        setGooglePlaceId(data.googlePlaceId);
        setGooglePlaceName(data.googlePlaceName);
        setOpeningHours(normalizeHours(data.openingHours));
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
    const data: PlaceDetails & { error?: string } = await res.json();

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
    if (data.openingHours && data.openingHours.length > 0) setOpeningHours(data.openingHours);
    // Mémorisé pour que le module Avis Google reconnaisse directement cette fiche (voir
    // docs/05-roadmap-poc.md) — persisté seulement au clic "Enregistrer", comme les autres champs.
    setGooglePlaceId(placeId);
    setGooglePlaceName(data.name || establishmentName);

    if (data.photoReferences.length > 0) {
      setImportingPhotos(true);
      await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/google-places/import-photos`, password, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoReferences: data.photoReferences }),
      });
      await loadImages();
      setImportingPhotos(false);
    }
  };

  const updateHour = (index: number, patch: Partial<DayHours>) => {
    setOpeningHours((current) => {
      const next = [...current];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  // N'active "Enregistrer" que si un champ édité sur cette page diffère de la dernière version
  // chargée/sauvegardée (`content`) — les photos ne comptent pas : elles s'enregistrent tout de
  // suite via leurs propres endpoints, indépendamment de ce bouton.
  const isDirty = Boolean(
    content &&
      (establishmentName !== content.establishmentName ||
        establishmentType !== content.establishmentType ||
        address !== content.address ||
        phone !== content.phone ||
        email !== content.email ||
        managerName !== content.managerName ||
        managerPhone !== content.managerPhone ||
        managerEmail !== content.managerEmail ||
        googlePlaceId !== content.googlePlaceId ||
        googlePlaceName !== content.googlePlaceName ||
        !hoursEqual(openingHours, normalizeHours(content.openingHours)))
  );

  const handleSave = async () => {
    if (!content) return;
    setSaveStatus("saving");
    const res = await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/content`, password, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteName: content.siteName,
        description: content.description,
        offers: content.offers.map(({ title, price, description, productId }) => ({
          title,
          price,
          description,
          productId,
        })),
        establishmentName,
        establishmentType,
        address,
        phone,
        email,
        managerName,
        managerPhone,
        managerEmail,
        googlePlaceId,
        googlePlaceName,
        openingHours,
      }),
    });
    if (res.ok) {
      setContent(await res.json());
      setSaveStatus("saved");
    } else {
      setSaveStatus("error");
    }
  };

  if (!content) return <p className="text-gray-text">Chargement…</p>;

  const cover = images[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-navy">Établissement</h1>
        <div className="flex items-center gap-3">
          {saveStatus === "saved" && <span className="text-sm text-green-accent">Enregistré</span>}
          {saveStatus === "error" && <span className="text-sm text-red-500">Erreur lors de l'enregistrement.</span>}
          <button
            type="button"
            onClick={handleSave}
            disabled={saveStatus === "saving" || !isDirty}
            className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saveStatus === "saving" ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border-subtle">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? "border-brand-mid text-navy"
                : "border-transparent text-gray-text hover:text-navy"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        {/* min-w-0 : sans ça, une piste de grid "1fr" ne se réduit jamais sous la taille intrinsèque
            de son contenu (ex. inputs "time" de l'onglet Horaires) et pousse toute la page en
            débordement horizontal au lieu de respecter la largeur de l'écran. */}
        <div className="flex min-w-0 flex-col gap-6">
          {activeTab === "info" && (
            <>
              <section className="rounded-card bg-white p-8 shadow-card">
                <h2 className="mb-1 text-lg font-bold text-navy">Établissement</h2>
                <p className="mb-4 text-sm text-gray-text">
                  Infos factuelles partagées entre modules (ex. Maps utilise l'adresse renseignée
                  ici). La recherche Google préremplit aussi les horaires et importe les 3 premières
                  photos disponibles (onglets Horaires et Photos).
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
                  <label className="text-sm font-medium text-gray-text">
                    Adresse mail
                    <input
                      type="email"
                      className={`mt-1 w-full ${inputClass}`}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contact@boulangerie-dupont.fr"
                    />
                  </label>
                </div>
              </section>

              <section className="rounded-card bg-white p-8 shadow-card">
                <h2 className="mb-1 text-lg font-bold text-navy">Responsable de l'établissement</h2>
                <p className="mb-4 text-sm text-gray-text">
                  Contact interne — jamais affiché sur le site public, à la différence des
                  coordonnées ci-dessus.
                </p>

                <div className="flex flex-col gap-3">
                  <label className="text-sm font-medium text-gray-text">
                    Nom du responsable
                    <input
                      className={`mt-1 w-full ${inputClass}`}
                      value={managerName}
                      onChange={(e) => setManagerName(e.target.value)}
                      placeholder="Julie Dupont"
                    />
                  </label>
                  <label className="text-sm font-medium text-gray-text">
                    Téléphone du responsable
                    <input
                      className={`mt-1 w-full ${inputClass}`}
                      value={managerPhone}
                      onChange={(e) => setManagerPhone(e.target.value)}
                      placeholder="+33 6 12 34 56 78"
                    />
                  </label>
                  <label className="text-sm font-medium text-gray-text">
                    Email du responsable
                    <input
                      type="email"
                      className={`mt-1 w-full ${inputClass}`}
                      value={managerEmail}
                      onChange={(e) => setManagerEmail(e.target.value)}
                      placeholder="julie@boulangerie-dupont.fr"
                    />
                  </label>
                </div>
              </section>
            </>
          )}

          {activeTab === "photos" && (
            <PhotosTab
              clientSiteId={clientSiteId}
              password={password}
              images={images}
              onImagesChanged={loadImages}
              importing={importingPhotos}
            />
          )}

          {activeTab === "hours" && <HoursTab hours={openingHours} onChange={updateHour} />}
        </div>

        <EstablishmentPreview
          name={establishmentName}
          type={establishmentType}
          address={address}
          phone={phone}
          email={email}
          cover={cover}
        />
      </div>
    </div>
  );
}
