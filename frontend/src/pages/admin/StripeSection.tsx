import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import { adminFetch } from "../../hooks/useAdminSession";
import SecretField from "../../components/SecretField";

type StripeSectionProps = {
  clientSiteId: string;
  password: string;
};

type Settings = { secretKey: string; webhookSecret: string };

const inputClass =
  "rounded-button border border-border-subtle bg-white px-3 py-2 font-mono text-sm text-navy placeholder:font-sans placeholder:text-gray-text/60 focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20";

export default function StripeSection({ clientSiteId, password }: StripeSectionProps) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/stripe/settings`, password)
      .then((res) => res.json())
      .then((data: Settings) => {
        setSettings(data);
        setSecretKey(data.secretKey);
        setWebhookSecret(data.webhookSecret);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDirty = Boolean(settings && (secretKey !== settings.secretKey || webhookSecret !== settings.webhookSecret));

  const handleSave = async () => {
    setSaveStatus("saving");
    const res = await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/stripe/settings`, password, {
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

  const webhookUrl = `${API_BASE_URL}/api/t/${clientSiteId}/stripe/webhook`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-navy">Paiement Stripe</h1>
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
          Le paiement se fait avec ton propre compte Stripe — l'argent arrive directement dessus, jamais
          via l'agence. Crée un compte sur{" "}
          <a href="https://dashboard.stripe.com/register" target="_blank" rel="noreferrer" className="font-medium text-brand-mid underline">
            stripe.com
          </a>
          , puis récupère les informations ci-dessous depuis ton tableau de bord.
        </p>

        <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
          Clé secrète (Développeurs → Clés API)
          <SecretField
            className={inputClass}
            value={secretKey}
            onChange={setSecretKey}
            placeholder="sk_live_… ou sk_test_… pour essayer sans encaisser réellement"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
          Secret de signature du webhook
          <SecretField
            className={inputClass}
            value={webhookSecret}
            onChange={setWebhookSecret}
            placeholder="whsec_…"
          />
        </label>

        <div className="flex flex-col gap-1 text-sm font-medium text-gray-text">
          URL du webhook à créer côté Stripe (Développeurs → Webhooks → Ajouter un endpoint, événement
          à écouter : <span className="font-mono text-navy">checkout.session.completed</span>)
          <input readOnly className={`${inputClass} text-gray-text`} value={webhookUrl} onFocus={(e) => e.target.select()} />
        </div>
      </section>
    </div>
  );
}
