import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import type { SiteContent } from "../../hooks/useContent";
import type { TemplateId } from "../../hooks/useTemplate";
import { adminFetch } from "../../hooks/useAdminSession";
import { TEMPLATES } from "../../templates/registry";

type SiteSectionProps = {
  clientSiteId: string;
  password: string;
};

const TABS = [
  { id: "template", label: "Modèle" },
  { id: "content", label: "Contenu" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const inputClass =
  "rounded-button border border-border-subtle bg-white px-3 py-2 text-navy placeholder:text-gray-text/60 focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20";

function TemplateTab({
  templateId,
  onChange,
}: {
  templateId: TemplateId | null;
  onChange: (id: TemplateId) => void;
}) {
  return (
    <section className="rounded-card bg-white p-8 shadow-card">
      <h2 className="mb-4 text-lg font-bold text-navy">Mise en page du site</h2>
      <div className="flex flex-col gap-3">
        {TEMPLATES.map((t) => (
          <label
            key={t.id}
            className="flex items-start gap-3 rounded-button border border-border-subtle p-3 has-[:checked]:border-brand-mid"
          >
            <input
              type="radio"
              name="template"
              checked={templateId === t.id}
              onChange={() => onChange(t.id)}
              className="mt-1 h-4 w-4 accent-brand-mid"
            />
            <span className="flex flex-col">
              <span className="font-semibold text-navy">{t.label}</span>
              <span className="text-sm text-gray-text">{t.description}</span>
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}

function ContentTab({
  siteName,
  description,
  onSiteNameChange,
  onDescriptionChange,
}: {
  siteName: string;
  description: string;
  onSiteNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}) {
  return (
    <section className="rounded-card bg-white p-8 shadow-card">
      <div className="flex flex-col gap-3">
        <label className="text-sm font-medium text-gray-text">
          Nom du site
          <input
            className={`mt-1 w-full ${inputClass}`}
            value={siteName}
            onChange={(e) => onSiteNameChange(e.target.value)}
          />
        </label>
        <label className="text-sm font-medium text-gray-text">
          Description
          <textarea
            className={`mt-1 w-full ${inputClass}`}
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
          />
        </label>
      </div>
    </section>
  );
}

export default function SiteSection({ clientSiteId, password }: SiteSectionProps) {
  const [activeTab, setActiveTab] = useState<TabId>("template");

  const [templateId, setTemplateId] = useState<TemplateId | null>(null);
  const [draftTemplateId, setDraftTemplateId] = useState<TemplateId | null>(null);

  // Tous les autres champs de SiteContent (établissement, offres…) sont édités sur d'autres pages
  // mais partagés avec elles via le même endpoint PUT /admin/content, qui remplace tout l'objet —
  // il faut donc les renvoyer tels que chargés pour ne pas les écraser à vide.
  const [content, setContent] = useState<SiteContent | null>(null);
  const [siteName, setSiteName] = useState("");
  const [description, setDescription] = useState("");

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/t/${clientSiteId}/template`)
      .then((res) => res.json())
      .then((data: { templateId: TemplateId }) => {
        setTemplateId(data.templateId);
        setDraftTemplateId(data.templateId);
      });
    fetch(`${API_BASE_URL}/api/t/${clientSiteId}/content`)
      .then((res) => res.json())
      .then((data: SiteContent) => {
        setContent(data);
        setSiteName(data.siteName);
        setDescription(data.description);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const templateDirty = draftTemplateId !== null && draftTemplateId !== templateId;
  const contentDirty = Boolean(content && (siteName !== content.siteName || description !== content.description));
  const isDirty = templateDirty || contentDirty;

  const handleSave = async () => {
    setSaveStatus("saving");

    const requests: Promise<Response>[] = [];

    if (templateDirty && draftTemplateId) {
      requests.push(
        adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/template`, password, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateId: draftTemplateId }),
        })
      );
    }

    if (contentDirty && content) {
      requests.push(
        adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/content`, password, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            siteName,
            description,
            offers: content.offers.map(({ title, price, description, productId }) => ({
              title,
              price,
              description,
              productId,
            })),
            establishmentName: content.establishmentName,
            establishmentType: content.establishmentType,
            address: content.address,
            phone: content.phone,
            email: content.email,
            managerName: content.managerName,
            managerPhone: content.managerPhone,
            managerEmail: content.managerEmail,
            openingHours: content.openingHours,
          }),
        })
      );
    }

    const results = await Promise.all(requests);
    const allOk = results.every((res) => res.ok);

    if (templateDirty && draftTemplateId) setTemplateId(draftTemplateId);
    if (contentDirty) {
      const contentRes = results[templateDirty ? 1 : 0];
      if (contentRes?.ok) setContent(await contentRes.json());
    }

    setSaveStatus(allOk ? "saved" : "error");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-navy">Site internet</h1>
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

      <div className="flex gap-2 border-b border-border-subtle">
        {TABS.map((tab) => (
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

      {activeTab === "template" && <TemplateTab templateId={draftTemplateId} onChange={setDraftTemplateId} />}
      {activeTab === "content" && (
        <ContentTab
          siteName={siteName}
          description={description}
          onSiteNameChange={setSiteName}
          onDescriptionChange={setDescription}
        />
      )}
    </div>
  );
}
