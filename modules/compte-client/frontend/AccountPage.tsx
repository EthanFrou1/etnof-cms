import { useEffect, useState } from "react";
import { t, type Locale } from "@modules/multilingue/frontend/translations";
// Même écart assumé que CartPage.tsx/BlogPostPage.tsx : cette page est montée seule par une route
// dédiée (App.tsx), pas nichée dans un template — elle résout sa propre palette via les hooks déjà
// utilisés par les templates plutôt que de dupliquer cette logique.
import { useTemplate, type TemplateId } from "../../../frontend/src/hooks/useTemplate";
import { useModules } from "../../../frontend/src/hooks/useModules";
import { useContent } from "../../../frontend/src/hooks/useContent";
import { resolvePalette } from "../../../frontend/src/templates/registry";
import SiteFooter from "../../../frontend/src/templates/SiteFooter";

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

type OrderItem = { id: string; productName: string; unitPrice: number; quantity: number; sizeLabel: string | null };
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

// Vue connectée : profil éditable + historique de commandes. Aucune modification de l'email en
// self-service (voir CompteClientModule.cs) — reste modifiable uniquement par le tenant depuis son
// admin (CRM Clients).
function AccountDashboard({
  clientSiteId,
  apiBaseUrl,
  sessionToken,
  palette,
  locale,
  onLogout,
}: {
  clientSiteId: string;
  apiBaseUrl: string;
  sessionToken: string;
  palette: { accent: string; ink: string };
  locale: Locale;
  onLogout: () => void;
}) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [form, setForm] = useState<Customer | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [expired, setExpired] = useState(false);

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
      setTimeout(() => setSaveStatus("idle"), 2000);
    } else {
      setSaveStatus("idle");
    }
  };

  const fieldClass = inputClass;
  const fieldStyle = { borderColor: `${palette.ink}33`, color: palette.ink };

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

        <div className="grid gap-3 sm:grid-cols-2">
          <input className={fieldClass} style={fieldStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t(locale, "catalogue.firstNamePlaceholder")} />
          <input className={fieldClass} style={fieldStyle} value={form.email} disabled placeholder={t(locale, "catalogue.emailPlaceholder")} />
          <input className={fieldClass} style={fieldStyle} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={t(locale, "catalogue.phonePlaceholder")} />
          <input className={fieldClass} style={fieldStyle} value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} placeholder={t(locale, "catalogue.addressPlaceholder")} />
          <input className={fieldClass} style={fieldStyle} value={form.addressLine2} onChange={(e) => setForm({ ...form, addressLine2: e.target.value })} placeholder={t(locale, "catalogue.addressLine2Placeholder")} />
          <div className="grid grid-cols-2 gap-3">
            <input className={fieldClass} style={fieldStyle} value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} placeholder={t(locale, "catalogue.postalCodePlaceholder")} />
            <input className={fieldClass} style={fieldStyle} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder={t(locale, "catalogue.cityPlaceholder")} />
          </div>
          <input className={fieldClass} style={fieldStyle} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder={t(locale, "catalogue.countryLabel")} />
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saveStatus === "saving"}
          className="self-start rounded-button px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ backgroundColor: palette.accent }}
        >
          {saveStatus === "saved" ? t(locale, "account.saved") : t(locale, "account.save")}
        </button>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold" style={{ color: palette.ink }}>
          {t(locale, "account.ordersTitle")}
        </h2>
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
                <div className="flex flex-col gap-1">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm" style={{ color: `${palette.ink}99` }}>
                      <span>
                        {item.quantity} × {item.productName}
                        {item.sizeLabel && ` (${item.sizeLabel})`}
                      </span>
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
    <SiteFooter content={content} palette={palette} modules={modules} locale={locale} dark />
  ) : (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-8">
      <SiteFooter content={content} palette={palette} modules={modules} locale={locale} />
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
