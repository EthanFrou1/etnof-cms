import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../config";
import { adminFetch } from "../../hooks/useAdminSession";
import { formatPrice, stripeInputClass } from "./shared";

type StripeAgencySettings = { secretKey: string; webhookSecret: string };

function StripePaymentPanel({ password }: { password: string }) {
  const [settings, setSettings] = useState<StripeAgencySettings | null>(null);
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    adminFetch(API_BASE_URL, "/api/admin/stripe-settings", password)
      .then((res) => res.json())
      .then((data: StripeAgencySettings) => {
        setSettings(data);
        setSecretKey(data.secretKey);
        setWebhookSecret(data.webhookSecret);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDirty = Boolean(settings && (secretKey !== settings.secretKey || webhookSecret !== settings.webhookSecret));

  const handleSave = async () => {
    setSaveStatus("saving");
    const res = await adminFetch(API_BASE_URL, "/api/admin/stripe-settings", password, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secretKey, webhookSecret }),
    });
    if (res.ok) {
      setSettings(await res.json());
      setSaveStatus("saved");
    } else {
      setSaveStatus("error");
    }
  };

  if (!settings) return <p className="text-gray-text">Chargement…</p>;

  const webhookUrl = `${API_BASE_URL}/api/public/invoices/stripe-webhook`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-navy">Paiement en ligne</h2>
          <p className="text-sm text-gray-text">Permet à tes clients de payer une facture en ligne, par carte.</p>
        </div>
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

      <section className="flex flex-col gap-5 rounded-card bg-white p-8 shadow-card">
        <p className="text-sm text-gray-text">
          C'est <strong>ton</strong> compte Stripe (celui de l'agence) — l'argent encaissé sur tes factures arrive
          directement dessus. Crée un compte sur{" "}
          <a href="https://dashboard.stripe.com/register" target="_blank" rel="noreferrer" className="font-medium text-brand-mid underline">
            stripe.com
          </a>{" "}
          si ce n'est pas déjà fait, puis récupère les informations ci-dessous depuis ton tableau de bord. Commence
          en mode test (clés <span className="font-mono">sk_test_…</span>) pour essayer sans encaisser réellement.
        </p>

        <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
          Clé secrète (Développeurs → Clés API)
          <input
            className={stripeInputClass}
            type="password"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            placeholder="sk_live_… ou sk_test_…"
            autoComplete="off"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
          Secret de signature du webhook
          <input
            className={stripeInputClass}
            type="password"
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            placeholder="whsec_…"
            autoComplete="off"
          />
        </label>

        <div className="flex flex-col gap-1 text-sm font-medium text-gray-text">
          URL du webhook à créer côté Stripe (Développeurs → Webhooks → Ajouter un endpoint, événement
          à écouter : <span className="font-mono text-navy">checkout.session.completed</span>)
          <input readOnly className={`${stripeInputClass} text-gray-text`} value={webhookUrl} onFocus={(e) => e.target.select()} />
        </div>
      </section>
    </div>
  );
}

type EmailSettings = { brevoApiKey: string };

function EmailConfirmationPanel({ password }: { password: string }) {
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [brevoApiKey, setBrevoApiKey] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    adminFetch(API_BASE_URL, "/api/admin/email-settings", password)
      .then((res) => res.json())
      .then((data: EmailSettings) => {
        setSettings(data);
        setBrevoApiKey(data.brevoApiKey);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDirty = Boolean(settings && brevoApiKey !== settings.brevoApiKey);

  const handleSave = async () => {
    setSaveStatus("saving");
    const res = await adminFetch(API_BASE_URL, "/api/admin/email-settings", password, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brevoApiKey }),
    });
    if (res.ok) {
      setSettings(await res.json());
      setSaveStatus("saved");
    } else {
      setSaveStatus("error");
    }
  };

  if (!settings) return <p className="text-gray-text">Chargement…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-navy">Email de confirmation</h2>
          <p className="text-sm text-gray-text">
            Envoyé automatiquement au client dès qu'une facture est payée en ligne (Stripe) ou marquée payée
            manuellement, avec la facture en pièce jointe.
          </p>
        </div>
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

      <section className="flex flex-col gap-5 rounded-card bg-white p-8 shadow-card">
        <p className="text-sm text-gray-text">
          Envoyé via ton compte{" "}
          <a href="https://app.brevo.com/settings/keys/api" target="_blank" rel="noreferrer" className="font-medium text-brand-mid underline">
            Brevo
          </a>
          , depuis l'adresse configurée dans l'onglet Entreprise. Vérifie que cette adresse est bien validée côté
          Brevo (Expéditeurs, Domaines) avant d'activer — sinon les emails partiront en échec silencieux.
        </p>

        <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
          Clé API Brevo
          <input
            className={stripeInputClass}
            type="password"
            value={brevoApiKey}
            onChange={(e) => setBrevoApiKey(e.target.value)}
            placeholder="xkeysib-…"
            autoComplete="off"
          />
        </label>
      </section>
    </div>
  );
}

type PaidInvoice = {
  id: string;
  number: string | null;
  totalHt: number;
  paidAt: string | null;
  paymentMethod: "stripe" | "manual";
  clientName: string;
};

const PAYMENT_METHOD_LABELS: Record<PaidInvoice["paymentMethod"], string> = {
  stripe: "Stripe",
  manual: "Manuel",
};

const PAYMENT_METHOD_STYLES: Record<PaidInvoice["paymentMethod"], string> = {
  stripe: "bg-brand-mid/10 text-brand-mid",
  manual: "bg-border-subtle/40 text-gray-text",
};

// Pas de table Payment dédiée — une facture payée EST le paiement (voir docs/13-facturation-devis.md,
// section "Envoi automatique de la facture..."), donc cette vue ne fait que filtrer/trier
// /api/admin/invoices côté client plutôt que d'appeler un nouvel endpoint.
function PaymentsPanel({ password }: { password: string }) {
  const [invoices, setInvoices] = useState<PaidInvoice[] | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    adminFetch(API_BASE_URL, "/api/admin/invoices", password)
      .then((res) => res.json())
      .then(setInvoices);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const paid = useMemo(
    () =>
      (invoices ?? [])
        .filter((i) => i.paidAt !== null)
        .sort((a, b) => new Date(b.paidAt!).getTime() - new Date(a.paidAt!).getTime()),
    [invoices]
  );

  const handleDownloadPdf = async (invoice: PaidInvoice) => {
    setDownloadingId(invoice.id);
    const res = await adminFetch(API_BASE_URL, `/api/admin/invoices/${invoice.id}/pdf`, password);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `facture-${invoice.number ?? "brouillon"}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
    setDownloadingId(null);
  };

  if (!invoices) return <p className="text-gray-text">Chargement…</p>;

  if (paid.length === 0) {
    return (
      <section className="rounded-card bg-white p-6 shadow-card">
        <p className="text-sm text-gray-text">Aucun paiement pour l'instant.</p>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm text-gray-text">
        {paid.length} paiement{paid.length > 1 ? "s" : ""}
      </span>

      <p className="text-xs text-gray-text sm:hidden">← Fais glisser le tableau pour voir plus de colonnes →</p>

      <div className="relative overflow-x-auto rounded-card bg-white shadow-card">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent sm:hidden" />
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-xs font-semibold uppercase tracking-[0.05em] text-gray-text">
              <th className="px-4 py-3 text-left">Date de paiement</th>
              <th className="px-4 py-3 text-left">Client</th>
              <th className="px-4 py-3 text-left">Facture</th>
              <th className="px-4 py-3 text-left">Montant</th>
              <th className="px-4 py-3 text-left">Moyen</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paid.map((invoice) => (
              <tr key={invoice.id} className="border-b border-border-subtle last:border-0 hover:bg-bg-page-start">
                <td className="whitespace-nowrap px-4 py-3 text-gray-text">
                  {new Date(invoice.paidAt!).toLocaleDateString("fr-FR")}
                </td>
                <td className="px-4 py-3 text-navy">{invoice.clientName}</td>
                <td className="whitespace-nowrap px-4 py-3 font-medium text-navy">{invoice.number ?? "Brouillon"}</td>
                <td className="whitespace-nowrap px-4 py-3 font-semibold text-navy">{formatPrice(invoice.totalHt)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-pill px-2.5 py-1 text-xs font-semibold ${PAYMENT_METHOD_STYLES[invoice.paymentMethod]}`}>
                    {PAYMENT_METHOD_LABELS[invoice.paymentMethod]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleDownloadPdf(invoice)}
                    disabled={downloadingId === invoice.id}
                    className="font-medium text-gray-text hover:text-navy disabled:opacity-40"
                  >
                    {downloadingId === invoice.id ? "Téléchargement…" : "Télécharger PDF"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const PAYMENT_TABS = [
  { id: "payments", label: "Paiements" },
  { id: "config", label: "Configuration" },
] as const;

type PaymentTabId = (typeof PAYMENT_TABS)[number]["id"];

export default function PaymentSection({ password }: { password: string }) {
  const [activeTab, setActiveTab] = useState<PaymentTabId>("payments");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-navy">Paiement</h1>
        <p className="text-sm text-gray-text">Suivi des paiements reçus et configuration du paiement en ligne.</p>
      </div>

      <div className="flex gap-2 border-b border-border-subtle">
        {PAYMENT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab.id ? "border-brand-mid text-navy" : "border-transparent text-gray-text hover:text-navy"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "payments" && <PaymentsPanel password={password} />}

      {activeTab === "config" && (
        <div className="flex flex-col gap-10">
          <StripePaymentPanel password={password} />
          <div className="border-t border-border-subtle pt-10">
            <EmailConfirmationPanel password={password} />
          </div>
        </div>
      )}
    </div>
  );
}
