import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import { adminFetch } from "../../hooks/useAdminSession";
import { stripeInputClass } from "./shared";

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
          <h1 className="text-2xl font-extrabold text-navy">Paiement</h1>
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
          <h1 className="text-2xl font-extrabold text-navy">Email de confirmation</h1>
          <p className="text-sm text-gray-text">
            Envoyé automatiquement au client dès qu'une facture est payée en ligne (Stripe), avec la facture en
            pièce jointe.
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

export default function PaymentSection({ password }: { password: string }) {
  return (
    <div className="flex flex-col gap-10">
      <StripePaymentPanel password={password} />
      <div className="border-t border-border-subtle pt-10">
        <EmailConfirmationPanel password={password} />
      </div>
    </div>
  );
}
