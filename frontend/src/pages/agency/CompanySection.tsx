import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import { adminFetch } from "../../hooks/useAdminSession";
import { inputClass } from "./shared";

type CompanyProfile = {
  id: string;
  legalName: string;
  tradeName: string;
  legalForm: string;
  siret: string;
  address: string;
  email: string;
  phone: string;
  vatMention: string;
  iban: string;
  bic: string;
  latePaymentMention: string;
  cgvUrl: string;
  websiteUrl: string;
  logoPath: string | null;
  updatedAt: string;
};

type CompanyProfileFormFields = Pick<
  CompanyProfile,
  | "legalName"
  | "tradeName"
  | "legalForm"
  | "siret"
  | "address"
  | "email"
  | "phone"
  | "vatMention"
  | "iban"
  | "bic"
  | "latePaymentMention"
  | "cgvUrl"
  | "websiteUrl"
>;

function toFormFields(profile: CompanyProfile): CompanyProfileFormFields {
  const {
    legalName,
    tradeName,
    legalForm,
    siret,
    address,
    email,
    phone,
    vatMention,
    iban,
    bic,
    latePaymentMention,
    cgvUrl,
    websiteUrl,
  } = profile;
  return {
    legalName,
    tradeName,
    legalForm,
    siret,
    address,
    email,
    phone,
    vatMention,
    iban,
    bic,
    latePaymentMention,
    cgvUrl,
    websiteUrl,
  };
}

export default function CompanySection({ password }: { password: string }) {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [form, setForm] = useState<CompanyProfileFormFields | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const load = () =>
    adminFetch(API_BASE_URL, "/api/admin/company-profile", password)
      .then((res) => res.json())
      .then((data: CompanyProfile) => {
        setProfile(data);
        setForm(toFormFields(data));
      });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDirty = Boolean(profile && form && JSON.stringify(form) !== JSON.stringify(toFormFields(profile)));

  const handleChange = (field: keyof CompanyProfileFormFields, value: string) => {
    setForm((f) => (f ? { ...f, [field]: value } : f));
  };

  const handleSave = async () => {
    if (!form) return;
    setSaveStatus("saving");
    const res = await adminFetch(API_BASE_URL, "/api/admin/company-profile", password, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const updated: CompanyProfile = await res.json();
      setProfile(updated);
      setForm(toFormFields(updated));
      setSaveStatus("saved");
    } else {
      setSaveStatus("error");
    }
  };

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    const body = new FormData();
    body.append("file", file);
    const res = await adminFetch(API_BASE_URL, "/api/admin/company-profile/logo", password, { method: "POST", body });
    if (res.ok) setProfile(await res.json());
    setUploadingLogo(false);
  };

  if (!profile || !form) return <p className="text-gray-text">Chargement…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">Entreprise</h1>
          <p className="text-sm text-gray-text">
            Infos utilisées sur tes devis et factures (mentions légales obligatoires en France).
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveStatus === "saved" && <span className="text-sm text-green-accent">Enregistré</span>}
          {saveStatus === "error" && <span className="text-sm text-red-500">Erreur lors de l'enregistrement.</span>}
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

      <section className="grid gap-6 rounded-card bg-white p-8 shadow-card lg:grid-cols-[1fr_220px]">
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-text">
              Raison sociale
              <input
                className={`mt-1 w-full ${inputClass}`}
                value={form.legalName}
                onChange={(e) => handleChange("legalName", e.target.value)}
              />
            </label>
            <label className="text-sm font-medium text-gray-text">
              Nom commercial
              <input
                className={`mt-1 w-full ${inputClass}`}
                value={form.tradeName}
                onChange={(e) => handleChange("tradeName", e.target.value)}
              />
            </label>
            <label className="text-sm font-medium text-gray-text">
              Forme juridique
              <input
                className={`mt-1 w-full ${inputClass}`}
                placeholder="ex : Auto-entrepreneur"
                value={form.legalForm}
                onChange={(e) => handleChange("legalForm", e.target.value)}
              />
            </label>
            <label className="text-sm font-medium text-gray-text">
              SIRET
              <input
                className={`mt-1 w-full ${inputClass}`}
                value={form.siret}
                onChange={(e) => handleChange("siret", e.target.value)}
              />
            </label>
          </div>

          <label className="text-sm font-medium text-gray-text">
            Adresse
            <input
              className={`mt-1 w-full ${inputClass}`}
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-text">
              Email
              <input
                type="email"
                className={`mt-1 w-full ${inputClass}`}
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
              />
            </label>
            <label className="text-sm font-medium text-gray-text">
              Téléphone
              <input
                className={`mt-1 w-full ${inputClass}`}
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
              />
            </label>
          </div>

          <label className="text-sm font-medium text-gray-text">
            Mention TVA (affichée sur chaque document)
            <input
              className={`mt-1 w-full ${inputClass}`}
              value={form.vatMention}
              onChange={(e) => handleChange("vatMention", e.target.value)}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-text">
              IBAN
              <input
                className={`mt-1 w-full ${inputClass}`}
                value={form.iban}
                onChange={(e) => handleChange("iban", e.target.value)}
              />
            </label>
            <label className="text-sm font-medium text-gray-text">
              BIC
              <input
                className={`mt-1 w-full ${inputClass}`}
                value={form.bic}
                onChange={(e) => handleChange("bic", e.target.value)}
              />
            </label>
          </div>

          <label className="text-sm font-medium text-gray-text">
            Mention pénalités de retard (pied de facture)
            <textarea
              className={`mt-1 w-full ${inputClass}`}
              rows={3}
              value={form.latePaymentMention}
              onChange={(e) => handleChange("latePaymentMention", e.target.value)}
            />
          </label>

          <label className="text-sm font-medium text-gray-text">
            Lien vers les CGV
            <input
              className={`mt-1 w-full ${inputClass}`}
              value={form.cgvUrl}
              onChange={(e) => handleChange("cgvUrl", e.target.value)}
            />
          </label>

          <label className="text-sm font-medium text-gray-text">
            Site web (affiché en pied des emails de confirmation)
            <input
              className={`mt-1 w-full ${inputClass}`}
              value={form.websiteUrl}
              onChange={(e) => handleChange("websiteUrl", e.target.value)}
            />
          </label>
        </div>

        <div className="flex flex-col items-center gap-3">
          <span className="text-sm font-medium text-gray-text">Logo</span>
          <div className="flex h-28 w-full items-center justify-center overflow-hidden rounded-button border border-dashed border-border-subtle bg-bg-page-start/60">
            {profile.logoPath ? (
              <img src={`${API_BASE_URL}${profile.logoPath}`} alt="Logo" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-xs text-gray-text">Aucun logo</span>
            )}
          </div>
          <label className="cursor-pointer rounded-button border border-border-subtle px-3 py-2 text-sm font-medium text-gray-text hover:bg-bg-page-start">
            {uploadingLogo ? "Envoi…" : profile.logoPath ? "Changer le logo" : "Ajouter un logo"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              className="hidden"
              disabled={uploadingLogo}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoUpload(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </section>
    </div>
  );
}
