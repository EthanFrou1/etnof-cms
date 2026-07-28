import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../../config";
import { adminFetch } from "../../hooks/useAdminSession";

type AvisGoogleSectionProps = {
  clientSiteId: string;
  password: string;
};

type PlaceResult = {
  placeId: string;
  name: string;
  address: string;
};

type Settings = {
  placeId: string;
  placeName: string;
  averageRating: number | null;
  userRatingsTotal: number | null;
  lastFetchedAt: string | null;
} | null;

type Review = {
  id: string;
  authorName: string;
  profilePhotoUrl: string | null;
  rating: number;
  text: string;
  relativeTimeDescription: string;
  selected: boolean;
};

const SEARCH_DEBOUNCE_MS = 400;

const inputClass =
  "rounded-button border border-border-subtle bg-white px-3 py-2 text-navy placeholder:text-gray-text/60 focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20";

function Stars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <span className="text-amber-400">
      {"★".repeat(rounded)}
      <span className="text-border-subtle">{"★".repeat(5 - rounded)}</span>
    </span>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="h-6 w-11 rounded-full bg-border-subtle transition-colors duration-200 peer-checked:bg-green-accent" />
      <div className="absolute left-1 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 peer-checked:translate-x-5" />
    </label>
  );
}

export default function AvisGoogleSection({ clientSiteId, password }: AvisGoogleSectionProps) {
  const [settings, setSettings] = useState<Settings>(null);
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [relinking, setRelinking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceResult[]>([]);
  const [inputFocused, setInputFocused] = useState(false);
  const [searchStatus, setSearchStatus] = useState<"idle" | "searching" | "error">("idle");
  const [searchError, setSearchError] = useState<string | null>(null);
  const latestQueryRef = useRef("");

  const load = async () => {
    const [settingsRes, reviewsRes] = await Promise.all([
      adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/avis-google/settings`, password),
      adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/avis-google/reviews`, password),
    ]);
    setSettings(await settingsRes.json());
    setReviews(await reviewsRes.json());
    setLoaded(true);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setSearchStatus("idle");
      return;
    }

    const timeout = setTimeout(async () => {
      latestQueryRef.current = trimmed;
      setSearchStatus("searching");
      setSearchError(null);

      const res = await adminFetch(
        API_BASE_URL,
        `/api/t/${clientSiteId}/admin/google-places/search?query=${encodeURIComponent(trimmed)}`,
        password
      );
      const data = await res.json();

      if (latestQueryRef.current !== trimmed) return;

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
  }, [query]);

  const handleLink = async (placeId: string, name: string) => {
    setSuggestions([]);
    setQuery("");
    setRefreshing(true);
    setRefreshError(null);

    const res = await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/avis-google/link`, password, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeId, placeName: name }),
    });
    const data = await res.json();

    if (!res.ok) {
      setRefreshError(data.error ?? "Impossible de lier cet établissement.");
      setRefreshing(false);
      return;
    }

    setRelinking(false);
    setRefreshing(false);
    await load();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshError(null);

    const res = await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/avis-google/refresh`, password, {
      method: "POST",
    });
    const data = await res.json();

    if (!res.ok) {
      setRefreshError(data.error ?? "Impossible d'actualiser les avis.");
      setRefreshing(false);
      return;
    }

    setRefreshing(false);
    await load();
  };

  const toggleReview = async (id: string, selected: boolean) => {
    // Optimiste : la liste bascule tout de suite, avant la confirmation du serveur — même esprit
    // que le toggle instantané de ModulesSection.tsx (pas de brouillon/dirty-check ici, un avis se
    // publie ou se retire immédiatement).
    setReviews((current) => current?.map((r) => (r.id === id ? { ...r, selected } : r)) ?? current);
    await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/avis-google/reviews/${id}`, password, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selected }),
    });
  };

  if (!loaded) return <p className="text-gray-text">Chargement…</p>;

  const showSearch = relinking || !settings;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-navy">Avis Google</h1>
        {settings && !showSearch && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setRelinking(true)}
              className="rounded-button border border-border-subtle px-4 py-2.5 text-sm font-semibold text-gray-text transition-colors hover:text-navy"
            >
              Changer d'établissement
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {refreshing ? "Actualisation…" : "Actualiser les avis"}
            </button>
          </div>
        )}
      </div>

      {refreshError && <p className="text-sm text-red-500">{refreshError}</p>}

      {showSearch ? (
        <section className="rounded-card bg-white p-8 shadow-card">
          <h2 className="mb-1 text-lg font-bold text-navy">
            {settings ? "Lier un autre établissement" : "Lier ton établissement Google"}
          </h2>
          <p className="mb-4 text-sm text-gray-text">
            Recherche ton établissement sur Google pour récupérer sa note et ses avis. Tu pourras
            ensuite choisir lesquels afficher sur le site public.
          </p>

          <label className="relative flex flex-col gap-1 text-sm font-medium text-gray-text">
            Nom de l'établissement
            <input
              className={inputClass}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
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
                      onClick={() => handleLink(r.placeId, r.name)}
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
          {searchStatus === "error" && searchError && <p className="mt-2 text-sm text-red-500">{searchError}</p>}

          {settings && (
            <button
              type="button"
              onClick={() => setRelinking(false)}
              className="mt-4 text-sm font-medium text-gray-text hover:text-navy"
            >
              Annuler
            </button>
          )}
        </section>
      ) : (
        settings && (
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-card bg-white p-6 shadow-card">
            <div>
              <p className="font-semibold text-navy">{settings.placeName}</p>
              {settings.averageRating !== null && (
                <p className="text-sm text-gray-text">
                  <Stars rating={settings.averageRating} /> {settings.averageRating.toFixed(1)}
                  {settings.userRatingsTotal !== null && ` (${settings.userRatingsTotal} avis Google)`}
                </p>
              )}
            </div>
            <p className="text-xs text-gray-text">
              {settings.lastFetchedAt
                ? `Actualisé le ${new Date(settings.lastFetchedAt).toLocaleDateString("fr-FR")}`
                : "Pas encore actualisé"}
            </p>
          </section>
        )
      )}

      {reviews && reviews.length > 0 && (
        <section className="rounded-card bg-white shadow-card">
          <div className="p-6 pb-0 text-sm text-gray-text">
            {reviews.length} avis récupéré{reviews.length > 1 ? "s" : ""} — choisis lesquels afficher sur le site public.
          </div>
          <div className="flex flex-col gap-3 p-6">
            {reviews.map((review) => (
              <div key={review.id} className="flex items-start gap-4 rounded-button bg-bg-page-start/60 p-4">
                {review.profilePhotoUrl ? (
                  <img src={review.profilePhotoUrl} alt="" className="h-9 w-9 shrink-0 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-text">
                    {review.authorName.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-navy">{review.authorName}</span>
                    <Stars rating={review.rating} />
                    <span className="text-xs text-gray-text">{review.relativeTimeDescription}</span>
                  </div>
                  {review.text && <p className="mt-1 text-sm text-gray-text">{review.text}</p>}
                </div>
                <div className="flex shrink-0 flex-col items-center gap-1">
                  <ToggleSwitch checked={review.selected} onChange={(value) => toggleReview(review.id, value)} />
                  <span className="text-[11px] text-gray-text">{review.selected ? "Affiché" : "Masqué"}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {reviews && reviews.length === 0 && settings && !showSearch && (
        <section className="rounded-card bg-white p-8 shadow-card">
          <p className="text-gray-text">
            Aucun avis récupéré pour l'instant — clique sur "Actualiser les avis" pour les récupérer depuis Google.
          </p>
        </section>
      )}
    </div>
  );
}
