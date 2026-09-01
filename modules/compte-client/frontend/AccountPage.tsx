import { useEffect, useState } from "react";
import { t, type Locale } from "@modules/multilingue/frontend/translations";
// Même écart assumé que CartPage.tsx/BlogPostPage.tsx : cette page est montée seule par une route
// dédiée (App.tsx), pas nichée dans un template — elle résout sa propre palette via les hooks déjà
// utilisés par les templates plutôt que de dupliquer cette logique.
import { useTemplate, type TemplateId } from "../../../frontend/src/hooks/useTemplate";
import { useModules } from "../../../frontend/src/hooks/useModules";
import { useContent, type SiteContent } from "../../../frontend/src/hooks/useContent";
import { resolvePalette } from "../../../frontend/src/templates/registry";
import SiteFooter, { LegalLinksBar } from "../../../frontend/src/templates/SiteFooter";
import SaveButton, { type SaveStatus } from "../../../frontend/src/components/admin/SaveButton";

// "Ink" et style de footer (clair/sombre) propres à chaque template — mêmes valeurs que CartPage.tsx
// (voir ce fichier pour le détail : pas de fichier partagé pour ça à ce jour).
const TEMPLATE_INK: Record<TemplateId, string> = { hestia: "#211A16", helios: "#1A1512", charis: "#111111" };
const TEMPLATE_FOOTER_DARK: Record<TemplateId, boolean> = { hestia: true, helios: false, charis: true };

function readStoredLocale(clientSiteId: string): Locale {
  const stored = localStorage.getItem(`etnof-locale-${clientSiteId}`);
  return stored === "en" || stored === "es" ? stored : "fr";
}

function sessionStorageKey(clientSiteId: string) {
  return `etnof-customer-session-${clientSiteId}`;
}

const formatPrice = (value: number) => value.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

const inputClass =
  "w-full rounded-button border px-3 py-2.5 text-sm";

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  country: string;
};

type OrderItem = {
  id: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  sizeLabel: string | null;
  imagePath: string | null;
};
type Order = { id: string; status: "pending" | "fulfilled" | "cancelled"; total: number; createdAt: string; items: OrderItem[] };

// Formulaire "recevoir un lien de connexion" — pas de mot de passe (voir docs/05-roadmap-poc.md pour
// la discussion complète) : le client entre son email, un lien de connexion valable 15 minutes lui
// est envoyé s'il correspond à un client existant (jamais révélé si ce n'est pas le cas).
function LoginRequestForm({
  clientSiteId,
  apiBaseUrl,
  palette,
  locale,
}: {
  clientSiteId: string;
  apiBaseUrl: string;
  palette: { accent: string; ink: string };
  locale: Locale;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    await fetch(`${apiBaseUrl}/api/t/${clientSiteId}/account/request-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => {});
    setStatus("sent");
  };

  if (status === "sent") {
    return <p style={{ color: `${palette.ink}99` }}>{t(locale, "account.loginLinkSent")}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="text-sm" style={{ color: `${palette.ink}99` }}>
        {t(locale, "account.loginIntro")}
      </p>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t(locale, "account.emailPlaceholder")}
        className={inputClass}
        style={{ borderColor: `${palette.ink}33`, color: palette.ink }}
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-button px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: palette.accent }}
      >
        {t(locale, "account.sendLoginLink")}
      </button>
    </form>
  );
}

// Atterrissage du lien reçu par email (`?token=...`) — n'établit JAMAIS la session au chargement de
// la page (GET /account/verify-login, sans effet de bord) : seul un clic explicite sur le bouton
// (POST /account/confirm-login) marque le lien comme utilisé et ouvre la session. Voir
// CustomerLoginToken.cs pour la raison (scanners de sécurité de messagerie qui pré-visitent les liens).
function ConfirmLoginView({
  clientSiteId,
  apiBaseUrl,
  token,
  palette,
  locale,
  onConfirmed,
}: {
  clientSiteId: string;
  apiBaseUrl: string;
  token: string;
  palette: { accent: string; ink: string };
  locale: Locale;
  onConfirmed: (sessionToken: string) => void;
}) {
  const [state, setState] = useState<"checking" | "valid" | "invalid" | "confirming">("checking");
  const [customerName, setCustomerName] = useState("");

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/t/${clientSiteId}/account/verify-login?token=${encodeURIComponent(token)}`)
      .then((res) => (res.ok ? res.json() : { valid: false }))
      .then((data: { valid: boolean; customerName?: string }) => {
        setState(data.valid ? "valid" : "invalid");
        setCustomerName(data.customerName ?? "");
      })
      .catch(() => setState("invalid"));
  }, [apiBaseUrl, clientSiteId, token]);

  const confirm = async () => {
    setState("confirming");
    const res = await fetch(`${apiBaseUrl}/api/t/${clientSiteId}/account/confirm-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      setState("invalid");
      return;
    }
    const data: { token: string } = await res.json();
    onConfirmed(data.token);
  };

  if (state === "checking") return null;

  if (state === "invalid") {
    return (
      <div className="flex flex-col gap-4">
        <p style={{ color: `${palette.ink}99` }}>{t(locale, "account.invalidLink")}</p>
        <LoginRequestForm clientSiteId={clientSiteId} apiBaseUrl={apiBaseUrl} palette={palette} locale={locale} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p style={{ color: `${palette.ink}99` }}>{t(locale, "account.confirmGreeting", { name: customerName })}</p>
      <button
        type="button"
        onClick={confirm}
        disabled={state === "confirming"}
        className="self-start rounded-button px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: palette.accent }}
      >
        {t(locale, "account.confirmButton")}
      </button>
    </div>
  );
}

const ORDER_STATUS_KEY: Record<Order["status"], string> = {
  pending: "account.orderStatusPending",
  fulfilled: "account.orderStatusFulfilled",
  cancelled: "account.orderStatusCancelled",
};

type LoyaltyState = {
  configured: boolean;
  mode: "points" | "stamps";
  threshold: number;
  rewardDescription: string;
  current: number;
  reached: boolean;
};

// Progression fidélité (module Fidélité, affichage seul — voir FideliteModule.cs) : n'apparaît que si
// le module est activé pour ce tenant ET que le tenant a bien enregistré sa page Fidélité admin
// (`configured`, sinon la carte n'a aucune valeur pour tromper un client sur une récompense qui n'a
// jamais été définie).
function LoyaltySection({
  clientSiteId,
  apiBaseUrl,
  sessionToken,
  palette,
  locale,
}: {
  clientSiteId: string;
  apiBaseUrl: string;
  sessionToken: string;
  palette: { accent: string; ink: string };
  locale: Locale;
}) {
  const [state, setState] = useState<LoyaltyState | null>(null);

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/t/${clientSiteId}/account/loyalty`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then(setState)
      .catch(() => {});
  }, [apiBaseUrl, clientSiteId, sessionToken]);

  if (!state || !state.configured) return null;

  const unit = t(locale, state.mode === "points" ? "account.loyaltyPointsUnit" : "account.loyaltyStampsUnit");
  const ratio = Math.min(1, state.current / state.threshold);

  return (
    <section className="flex flex-col gap-3 rounded-card border p-6" style={{ borderColor: `${palette.ink}1A` }}>
      <h2 className="text-lg font-semibold" style={{ color: palette.ink }}>
        {t(locale, "account.loyaltyTitle")}
      </h2>

      <div className="flex items-center justify-between text-sm" style={{ color: `${palette.ink}99` }}>
        <span>
          {state.current} / {state.threshold} {unit}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: `${palette.ink}0D` }}>
        <div className="h-full rounded-full" style={{ width: `${ratio * 100}%`, backgroundColor: palette.accent }} />
      </div>

      {state.rewardDescription && (
        <p className="text-sm" style={{ color: state.reached ? palette.accent : `${palette.ink}99` }}>
          {state.reached ? t(locale, "account.loyaltyReached") : t(locale, "account.loyaltyReward", { reward: state.rewardDescription })}
        </p>
      )}
    </section>
  );
}

// Vue connectée : profil éditable + historique de commandes. Aucune modification de l'email en
// self-service (voir CompteClientModule.cs) — reste modifiable uniquement par le tenant depuis son
// admin (CRM Clients).
function AccountDashboard({
  clientSiteId,
  apiBaseUrl,
  sessionToken,
  palette,
  locale,
  content,
  modules,
  onLogout,
}: {
  clientSiteId: string;
  apiBaseUrl: string;
  sessionToken: string;
  palette: { accent: string; ink: string };
  locale: Locale;
  content: SiteContent | null;
  modules: ReturnType<typeof useModules>;
  onLogout: () => void;
}) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [form, setForm] = useState<Customer | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [expired, setExpired] = useState(false);
  // Lecture seule par défaut (demande d'Ethan) : un formulaire ouvert d'emblée incite à modifier des
  // infos qui n'ont pas besoin de l'être — "Modifier mes informations" révèle le formulaire au clic.
  const [editing, setEditing] = useState(false);

  const load = () => {
    fetch(`${apiBaseUrl}/api/t/${clientSiteId}/account/me`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
      .then((res) => {
        if (res.status === 401) {
          setExpired(true);
          return null;
        }
        return res.ok ? res.json() : null;
      })
      .then((data: { customer: Customer; orders: Order[] } | null) => {
        if (!data) return;
        setCustomer(data.customer);
        setForm(data.customer);
        setOrders(data.orders);
      });
  };

  useEffect(load, [apiBaseUrl, clientSiteId, sessionToken]);

  useEffect(() => {
    if (expired) onLogout();
  }, [expired, onLogout]);

  if (!customer || !form) return null;

  const dirty = JSON.stringify(form) !== JSON.stringify(customer);

  const handleSave = async () => {
    setSaveStatus("saving");
    const res = await fetch(`${apiBaseUrl}/api/t/${clientSiteId}/account/me`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionToken}` },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const updated: Customer = await res.json();
      setCustomer(updated);
      setForm(updated);
      setSaveStatus("saved");
    } else {
      setSaveStatus("error");
    }
  };

  const handleCancel = () => {
    setForm(customer);
    setEditing(false);
  };

  const fieldClass = inputClass;
  const fieldStyle = { borderColor: `${palette.ink}33`, color: palette.ink };
  const labelClass = "flex flex-col gap-1 text-xs font-medium";
  const labelStyle = { color: `${palette.ink}99` };

  // Libellés repris des placeholders déjà traduits du formulaire de commande (catalogue.*) plutôt
  // que de dupliquer les mêmes chaînes sous une nouvelle clé i18n.
  const infoField = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    options?: { disabled?: boolean; fullWidth?: boolean }
  ) => (
    <label className={`${labelClass} ${options?.fullWidth ? "sm:col-span-2" : ""}`} style={labelStyle}>
      {label}
      <input
        className={fieldClass}
        style={fieldStyle}
        value={value}
        disabled={options?.disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4 rounded-card border p-6" style={{ borderColor: `${palette.ink}1A` }}>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold" style={{ color: palette.ink }}>
            {t(locale, "account.profileTitle")}
          </h2>
          <button type="button" onClick={onLogout} className="text-xs font-medium hover:underline" style={{ color: `${palette.ink}80` }}>
            {t(locale, "account.logout")}
          </button>
        </div>

        {editing ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {infoField(t(locale, "catalogue.firstNamePlaceholder"), form.name, (v) => setForm({ ...form, name: v }))}
              {infoField(t(locale, "catalogue.emailPlaceholder"), form.email, () => {}, { disabled: true })}
              {infoField(t(locale, "catalogue.phonePlaceholder"), form.phone, (v) => setForm({ ...form, phone: v }))}
              {infoField(t(locale, "catalogue.addressPlaceholder"), form.addressLine1, (v) => setForm({ ...form, addressLine1: v }), { fullWidth: true })}
              {infoField(t(locale, "catalogue.addressLine2Placeholder"), form.addressLine2, (v) => setForm({ ...form, addressLine2: v }), { fullWidth: true })}
              {infoField(t(locale, "catalogue.postalCodePlaceholder"), form.postalCode, (v) => setForm({ ...form, postalCode: v }))}
              {infoField(t(locale, "catalogue.cityPlaceholder"), form.city, (v) => setForm({ ...form, city: v }))}
              {infoField(t(locale, "catalogue.countryLabel"), form.country, (v) => setForm({ ...form, country: v }))}
            </div>

            <div className="flex items-center gap-3">
              <SaveButton
                status={saveStatus}
                onClick={handleSave}
                onIdle={() => {
                  setSaveStatus("idle");
                  if (saveStatus === "saved") setEditing(false);
                }}
                disabled={!dirty}
                idleColor={palette.accent}
                idleLabel={t(locale, "account.save")}
              />
              <button
                type="button"
                onClick={handleCancel}
                className="self-start rounded-button px-5 py-2.5 text-sm font-semibold hover:underline"
                style={{ color: `${palette.ink}99` }}
              >
                {t(locale, "account.cancel")}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              {[
                [t(locale, "catalogue.firstNamePlaceholder"), customer.name],
                [t(locale, "catalogue.emailPlaceholder"), customer.email],
                [t(locale, "catalogue.phonePlaceholder"), customer.phone],
                [t(locale, "catalogue.addressPlaceholder"), customer.addressLine1, true],
                ...(customer.addressLine2 ? [[t(locale, "catalogue.addressLine2Placeholder"), customer.addressLine2, true]] : []),
                [t(locale, "catalogue.postalCodePlaceholder"), customer.postalCode],
                [t(locale, "catalogue.cityPlaceholder"), customer.city],
                [t(locale, "catalogue.countryLabel"), customer.country],
              ].map(([label, value, fullWidth], i) => (
                <div key={i} className={`flex flex-col gap-0.5 ${fullWidth ? "sm:col-span-2" : ""}`}>
                  <span className="text-xs font-medium" style={labelStyle}>
                    {label}
                  </span>
                  <span style={{ color: palette.ink }}>{value || "—"}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setEditing(true)}
              className="self-start rounded-button border px-5 py-2.5 text-sm font-semibold transition-colors hover:opacity-80"
              style={{ borderColor: `${palette.ink}33`, color: palette.ink }}
            >
              {t(locale, "account.editInfo")}
            </button>
          </>
        )}
      </section>

      {modules?.fidelite?.enabled && (
        <LoyaltySection clientSiteId={clientSiteId} apiBaseUrl={apiBaseUrl} sessionToken={sessionToken} palette={palette} locale={locale} />
      )}

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold" style={{ color: palette.ink }}>
            {t(locale, "account.ordersTitle")}
          </h2>
          {/* mailto simple plutôt qu'un formulaire dédié (module Contact déjà là pour ça, pas
              garanti actif) — content.email, jamais managerEmail (contact interne, voir SiteContent.cs). */}
          {content?.email && (
            <a
              href={`mailto:${content.email}`}
              className="text-xs font-medium hover:underline"
              style={{ color: palette.accent }}
            >
              {t(locale, "account.contactEstablishment")}
            </a>
          )}
        </div>
        {orders.length === 0 ? (
          <p className="text-sm" style={{ color: `${palette.ink}99` }}>
            {t(locale, "account.noOrders")}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {orders.map((order) => (
              <div key={order.id} className="flex flex-col gap-2 rounded-card border p-4" style={{ borderColor: `${palette.ink}1A` }}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium" style={{ color: palette.ink }}>
                    {new Date(order.createdAt).toLocaleDateString("fr-FR")}
                  </span>
                  <span className="rounded-pill px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: `${palette.accent}1A`, color: palette.accent }}>
                    {t(locale, ORDER_STATUS_KEY[order.status])}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 text-sm" style={{ color: `${palette.ink}99` }}>
                      <div className="flex items-center gap-3">
                        {item.imagePath ? (
                          <img
                            src={`${apiBaseUrl}${item.imagePath}`}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-button object-cover"
                            style={{ borderColor: `${palette.ink}1A` }}
                          />
                        ) : (
                          <div className="h-10 w-10 shrink-0 rounded-button" style={{ backgroundColor: `${palette.ink}0D` }} />
                        )}
                        <span>
                          {item.quantity} × {item.productName}
                          {item.sizeLabel && ` (${item.sizeLabel})`}
                        </span>
                      </div>
                      <span>{formatPrice(item.unitPrice * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between border-t pt-2 text-sm font-semibold" style={{ borderColor: `${palette.ink}1A`, color: palette.ink }}>
                  <span>{t(locale, "account.orderTotal")}</span>
                  <span>{formatPrice(order.total)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sous le bloc commandes plutôt qu'en bas de page (SiteFooter la masque sur cette page via
          hideLegalLinks) — demande d'Ethan : trop d'espace vide jusqu'au footer, le client passait
          à côté des CGV/mentions légales en scrollant depuis "Mes commandes". */}
      <LegalLinksBar
        clientSiteId={clientSiteId}
        content={content}
        color={`${palette.ink}99`}
        borderColor={`${palette.ink}1A`}
      />
    </div>
  );
}

type AccountPageProps = { clientSiteId: string; apiBaseUrl: string };

export default function AccountPage({ clientSiteId, apiBaseUrl }: AccountPageProps) {
  const { templateId, paletteId, customAccent, logoUrl } = useTemplate(clientSiteId);
  const modules = useModules(clientSiteId);
  const content = useContent(clientSiteId);
  const locale = readStoredLocale(clientSiteId);

  const resolvedPaletteModule = templateId ? resolvePalette(templateId, paletteId, customAccent) : null;
  const background = resolvedPaletteModule?.background ?? "#F8FAFC";
  const accent = resolvedPaletteModule?.accent ?? "#2563EB";
  const ink = templateId ? TEMPLATE_INK[templateId] : "#1E293B";
  const footerDark = templateId ? TEMPLATE_FOOTER_DARK[templateId] : false;
  const palette = { accent, background, ink };

  const [sessionToken, setSessionToken] = useState<string | null>(() => localStorage.getItem(sessionStorageKey(clientSiteId)));
  const urlToken = new URLSearchParams(window.location.search).get("token");

  const handleConfirmed = (token: string) => {
    localStorage.setItem(sessionStorageKey(clientSiteId), token);
    setSessionToken(token);
    // Retire ?token=... de l'URL une fois la session établie — sinon rafraîchir la page relancerait
    // (vainement, le lien est déjà marqué utilisé) le flux de confirmation.
    window.history.replaceState(null, "", `/t/${clientSiteId}/compte`);
  };

  const handleLogout = () => {
    localStorage.removeItem(sessionStorageKey(clientSiteId));
    setSessionToken(null);
  };

  const footer = footerDark ? (
    <SiteFooter clientSiteId={clientSiteId} content={content} palette={palette} modules={modules} locale={locale} dark hideLegalLinks={Boolean(sessionToken)} />
  ) : (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-8">
      <SiteFooter clientSiteId={clientSiteId} content={content} palette={palette} modules={modules} locale={locale} hideLegalLinks={Boolean(sessionToken)} />
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: background }}>
      <div className="flex-1 px-4 py-6 pb-16 sm:px-8 sm:pb-20">
        <div className="mx-auto flex max-w-lg flex-col gap-8">
          <div className="flex items-center justify-between">
            <a href={`/t/${clientSiteId}`} className="text-sm font-medium hover:opacity-70" style={{ color: `${ink}99` }}>
              {t(locale, "blog.backToSite")}
            </a>
            {content?.siteName && (
              <a href={`/t/${clientSiteId}`} className="flex items-center gap-2">
                {logoUrl && <img src={`${apiBaseUrl}${logoUrl}`} alt={content.siteName} className="h-8 w-8 rounded-full object-cover" />}
                <span className="text-sm font-semibold" style={{ color: ink }}>
                  {content.siteName}
                </span>
              </a>
            )}
          </div>

          <h1 className="text-2xl font-bold" style={{ color: ink }}>
            {t(locale, "account.title")}
          </h1>

          {sessionToken ? (
            <AccountDashboard
              clientSiteId={clientSiteId}
              apiBaseUrl={apiBaseUrl}
              sessionToken={sessionToken}
              palette={{ accent, ink }}
              locale={locale}
              content={content}
              modules={modules}
              onLogout={handleLogout}
            />
          ) : urlToken ? (
            <ConfirmLoginView
              clientSiteId={clientSiteId}
              apiBaseUrl={apiBaseUrl}
              token={urlToken}
              palette={{ accent, ink }}
              locale={locale}
              onConfirmed={handleConfirmed}
            />
          ) : (
            <LoginRequestForm clientSiteId={clientSiteId} apiBaseUrl={apiBaseUrl} palette={{ accent, ink }} locale={locale} />
          )}
        </div>
      </div>
      {footer}
    </div>
  );
}
