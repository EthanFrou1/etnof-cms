import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import { adminFetch } from "../../hooks/useAdminSession";
import { useModules } from "../../hooks/useModules";
import AutoTranslateButton, { translateTexts } from "../../components/admin/AutoTranslateButton";

type MultilingueSectionProps = {
  clientSiteId: string;
  password: string;
};

type Locale = "en" | "es";

const LOCALES: { id: Locale; label: string }[] = [
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
];

const inputClass =
  "rounded-button border border-border-subtle bg-white px-3 py-2 text-navy placeholder:text-gray-text/60 focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20";
const readOnlyClass =
  "rounded-button border border-border-subtle bg-bg-page-start/60 px-3 py-2 text-gray-text";

type SiteTranslation = {
  original: { siteName: string; description: string };
  translated: { siteName: string; description: string };
};

function SitePanel({ clientSiteId, password, locale }: { clientSiteId: string; password: string; locale: Locale }) {
  const [data, setData] = useState<SiteTranslation | null>(null);
  const [draft, setDraft] = useState({ siteName: "", description: "" });
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const load = () =>
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/multilingue/site?locale=${locale}`, password)
      .then((res) => res.json())
      .then((d: SiteTranslation) => {
        setData(d);
        setDraft(d.translated);
      });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  const isDirty = Boolean(data && JSON.stringify(draft) !== JSON.stringify(data.translated));

  const saveSite = async (values: { siteName: string; description: string }) => {
    setSaveStatus("saving");
    await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/multilingue/site`, password, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale, siteName: values.siteName, description: values.description }),
    });
    await load();
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus((c) => (c === "saved" ? "idle" : c)), 1500);
  };

  const handleSave = () => saveSite(draft);

  if (!data) return <p className="text-gray-text">Chargement…</p>;

  const localeLabel = LOCALES.find((l) => l.id === locale)?.label ?? locale;

  return (
    <section className="rounded-card bg-white p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-navy">Site internet</h2>
          <p className="text-sm text-gray-text">Nom et description affichés sur la page d'accueil publique.</p>
        </div>
        <div className="flex items-center gap-3">
          {saveStatus === "saved" && <span className="text-sm text-green-accent">Enregistré</span>}
          <AutoTranslateButton
            onTranslate={async () => {
              const [siteName, description] = await translateTexts(
                clientSiteId,
                password,
                [data.original.siteName, data.original.description],
                locale
              );
              setDraft({ siteName, description });
              await saveSite({ siteName, description });
            }}
          />
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

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
          Nom du site (FR)
          <input className={readOnlyClass} value={data.original.siteName} readOnly />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
          Nom du site ({localeLabel})
          <input
            className={inputClass}
            value={draft.siteName}
            placeholder={data.original.siteName}
            onChange={(e) => setDraft({ ...draft, siteName: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-text sm:col-span-2">
          Description (FR)
          <textarea className={readOnlyClass} value={data.original.description} readOnly rows={3} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-text sm:col-span-2">
          Description ({localeLabel})
          <textarea
            className={inputClass}
            value={draft.description}
            placeholder={data.original.description}
            rows={3}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </label>
      </div>
    </section>
  );
}

type OfferTranslation = {
  offerId: string;
  original: { title: string; description: string };
  translated: { title: string; description: string };
};

function OffersPanel({ clientSiteId, password, locale }: { clientSiteId: string; password: string; locale: Locale }) {
  const [offers, setOffers] = useState<OfferTranslation[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { title: string; description: string }>>({});
  const [savedId, setSavedId] = useState<string | null>(null);

  const load = () =>
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/multilingue/offers?locale=${locale}`, password)
      .then((res) => res.json())
      .then((data: OfferTranslation[]) => {
        setOffers(data);
        setDrafts(Object.fromEntries(data.map((o) => [o.offerId, o.translated])));
      });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  const saveOffer = async (offerId: string, values: { title: string; description: string }) => {
    await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/multilingue/offers/${offerId}`, password, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale, title: values.title, description: values.description }),
    });
    await load();
    setSavedId(offerId);
    setTimeout(() => setSavedId((current) => (current === offerId ? null : current)), 1500);
  };

  const handleSave = (offerId: string) => saveOffer(offerId, drafts[offerId]);

  if (!offers) return <p className="text-gray-text">Chargement…</p>;

  const localeLabel = LOCALES.find((l) => l.id === locale)?.label ?? locale;

  return (
    <section className="rounded-card bg-white p-6 shadow-card">
      <h2 className="mb-1 text-lg font-bold text-navy">Offres</h2>
      <p className="mb-4 text-sm text-gray-text">Titre et description de chaque offre, dans la langue choisie.</p>

      {offers.length === 0 ? (
        <p className="text-sm text-gray-text">Aucune offre pour l'instant — ajoutez-en depuis la page "Offres".</p>
      ) : (
        <div className="flex flex-col gap-6">
          {offers.map((offer) => {
            const draft = drafts[offer.offerId] ?? offer.translated;
            const isDirty = JSON.stringify(draft) !== JSON.stringify(offer.translated);
            return (
              <div key={offer.offerId} className="flex flex-col gap-3 border-t border-border-subtle pt-4 first:border-0 first:pt-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-navy">{offer.original.title || "(sans titre)"}</span>
                  <div className="flex items-center gap-3">
                    {savedId === offer.offerId && <span className="text-sm text-green-accent">Enregistré</span>}
                    <AutoTranslateButton
                      onTranslate={async () => {
                        const [title, description] = await translateTexts(
                          clientSiteId,
                          password,
                          [offer.original.title, offer.original.description],
                          locale
                        );
                        setDrafts((current) => ({ ...current, [offer.offerId]: { title, description } }));
                        await saveOffer(offer.offerId, { title, description });
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleSave(offer.offerId)}
                      disabled={!isDirty}
                      className="rounded-button border border-border-subtle px-3 py-1.5 text-sm font-medium text-gray-text transition-opacity hover:bg-bg-page-start disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Enregistrer
                    </button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input className={readOnlyClass} value={offer.original.title} readOnly />
                  <input
                    className={inputClass}
                    placeholder={offer.original.title}
                    value={draft.title}
                    onChange={(e) => setDrafts({ ...drafts, [offer.offerId]: { ...draft, title: e.target.value } })}
                  />
                  <textarea className={readOnlyClass} value={offer.original.description} readOnly rows={2} />
                  <textarea
                    className={inputClass}
                    placeholder={offer.original.description}
                    rows={2}
                    value={draft.description}
                    onChange={(e) => setDrafts({ ...drafts, [offer.offerId]: { ...draft, description: e.target.value } })}
                  />
                </div>
                <p className="text-xs text-gray-text/70">Colonne de droite : {localeLabel}</p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

type BlogTranslation = {
  postId: string;
  original: { title: string; content: string };
  translated: { title: string; content: string };
};

function BlogPanel({ clientSiteId, password, locale }: { clientSiteId: string; password: string; locale: Locale }) {
  const [posts, setPosts] = useState<BlogTranslation[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { title: string; content: string }>>({});
  const [savedId, setSavedId] = useState<string | null>(null);

  const load = () =>
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/multilingue/blog?locale=${locale}`, password)
      .then((res) => res.json())
      .then((data: BlogTranslation[]) => {
        setPosts(data);
        setDrafts(Object.fromEntries(data.map((p) => [p.postId, p.translated])));
      });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  const savePost = async (postId: string, values: { title: string; content: string }) => {
    await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/multilingue/blog/${postId}`, password, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale, title: values.title, content: values.content }),
    });
    await load();
    setSavedId(postId);
    setTimeout(() => setSavedId((current) => (current === postId ? null : current)), 1500);
  };

  const handleSave = (postId: string) => savePost(postId, drafts[postId]);

  if (!posts) return <p className="text-gray-text">Chargement…</p>;

  const localeLabel = LOCALES.find((l) => l.id === locale)?.label ?? locale;

  return (
    <section className="rounded-card bg-white p-6 shadow-card">
      <h2 className="mb-1 text-lg font-bold text-navy">Articles de blog</h2>
      <p className="mb-4 text-sm text-gray-text">Titre et contenu de chaque article, dans la langue choisie.</p>

      {posts.length === 0 ? (
        <p className="text-sm text-gray-text">Aucun article pour l'instant — ajoutez-en depuis la page "Blog".</p>
      ) : (
        <div className="flex flex-col gap-6">
          {posts.map((post) => {
            const draft = drafts[post.postId] ?? post.translated;
            const isDirty = JSON.stringify(draft) !== JSON.stringify(post.translated);
            return (
              <div key={post.postId} className="flex flex-col gap-3 border-t border-border-subtle pt-4 first:border-0 first:pt-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-navy">{post.original.title || "(sans titre)"}</span>
                  <div className="flex items-center gap-3">
                    {savedId === post.postId && <span className="text-sm text-green-accent">Enregistré</span>}
                    <AutoTranslateButton
                      onTranslate={async () => {
                        const [title, content] = await translateTexts(
                          clientSiteId,
                          password,
                          [post.original.title, post.original.content],
                          locale
                        );
                        setDrafts((current) => ({ ...current, [post.postId]: { title, content } }));
                        await savePost(post.postId, { title, content });
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleSave(post.postId)}
                      disabled={!isDirty}
                      className="rounded-button border border-border-subtle px-3 py-1.5 text-sm font-medium text-gray-text transition-opacity hover:bg-bg-page-start disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Enregistrer
                    </button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input className={readOnlyClass} value={post.original.title} readOnly />
                  <input
                    className={inputClass}
                    placeholder={post.original.title}
                    value={draft.title}
                    onChange={(e) => setDrafts({ ...drafts, [post.postId]: { ...draft, title: e.target.value } })}
                  />
                  <textarea className={readOnlyClass} value={post.original.content} readOnly rows={5} />
                  <textarea
                    className={inputClass}
                    placeholder={post.original.content}
                    rows={5}
                    value={draft.content}
                    onChange={(e) => setDrafts({ ...drafts, [post.postId]: { ...draft, content: e.target.value } })}
                  />
                </div>
                <p className="text-xs text-gray-text/70">Colonne de droite : {localeLabel}</p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function MultilingueSection({ clientSiteId, password }: MultilingueSectionProps) {
  const [locale, setLocale] = useState<Locale>("en");
  const modules = useModules(clientSiteId);
  const blogEnabled = Boolean(modules?.blog?.enabled);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-navy">Multilingue</h1>
        <p className="text-sm text-gray-text">
          Traduis ton site et tes articles de blog — un champ laissé vide affiche automatiquement la version
          française, jamais un texte blanc.
        </p>
      </div>

      <div className="flex gap-2 border-b border-border-subtle">
        {LOCALES.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => setLocale(l.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
              locale === l.id ? "border-brand-mid text-navy" : "border-transparent text-gray-text hover:text-navy"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      <SitePanel clientSiteId={clientSiteId} password={password} locale={locale} />
      <OffersPanel clientSiteId={clientSiteId} password={password} locale={locale} />
      {blogEnabled && <BlogPanel clientSiteId={clientSiteId} password={password} locale={locale} />}
    </div>
  );
}
