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

function TemplateCard({
  template,
  isSelected,
  onSelect,
  paletteId,
  onPaletteChange,
}: {
  template: (typeof TEMPLATES)[number];
  isSelected: boolean;
  onSelect: () => void;
  paletteId: string | null;
  onPaletteChange: (id: string) => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  // La card du template sélectionné suit la palette de brouillon en cours ; les autres cards (non
  // sélectionnées) restent sur leur image par défaut (1re palette). C'est ce qui fait "changer l'image
  // de fond du modèle en fonction de la palette activée", demandé par Ethan.
  const activePalette =
    isSelected && template.palettes.length > 0
      ? template.palettes.find((p) => p.id === paletteId) ?? template.palettes[0]
      : template.palettes[0];
  const imageSrc = activePalette?.previewImage ?? template.previewImage;
  const fallbackGradient = activePalette
    ? `linear-gradient(135deg, ${activePalette.background}, ${activePalette.accent})`
    : undefined;

  return (
    <div
      className={`overflow-hidden rounded-card bg-white shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-soft ${
        isSelected ? "ring-2 ring-brand-mid" : ""
      }`}
    >
      <div
        onClick={onSelect}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect()}
        className="group relative block aspect-[16/10] w-full cursor-pointer overflow-hidden bg-brand-gradient"
      >
        {imageSrc && !imgFailed ? (
          <img
            key={imageSrc}
            src={imageSrc}
            alt=""
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-4xl font-black text-white/30"
            style={fallbackGradient ? { backgroundImage: fallbackGradient } : undefined}
          >
            {template.label.charAt(0)}
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/80 via-navy/5 to-transparent" />

        {isSelected && (
          <span className="absolute left-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-brand-mid text-xs font-bold text-white shadow-soft">
            ✓
          </span>
        )}

        <span className="absolute bottom-3 left-4 text-lg font-bold text-white drop-shadow-sm">
          {template.label}
        </span>

        {/* Palette de couleurs en overlay, en bas à droite de la card — seulement sur le template
            actuellement sélectionné (choisir une palette n'a de sens que pour lui). */}
        {isSelected && template.palettes.length > 0 && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-2.5 right-3 flex items-center gap-1.5 rounded-pill bg-navy/50 px-2 py-1.5 backdrop-blur-sm"
          >
            {template.palettes.map((p) => (
              <button
                key={p.id}
                type="button"
                title={p.label}
                onClick={() => onPaletteChange(p.id)}
                className={`h-5 w-5 overflow-hidden rounded-full border-2 transition-colors ${
                  paletteId === p.id ? "border-white" : "border-white/30 hover:border-white/70"
                }`}
              >
                <span className="flex h-full w-full">
                  <span className="h-full w-1/2" style={{ backgroundColor: p.background }} />
                  <span className="h-full w-1/2" style={{ backgroundColor: p.accent }} />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-4">
        <p className="text-sm text-gray-text">{template.description}</p>
      </div>
    </div>
  );
}

function TemplateTab({
  templateId,
  onTemplateChange,
  paletteId,
  onPaletteChange,
}: {
  templateId: TemplateId | null;
  onTemplateChange: (id: TemplateId) => void;
  paletteId: string | null;
  onPaletteChange: (id: string) => void;
}) {
  return (
    <section>
      <h2 className="mb-4 text-lg font-bold text-navy">Mise en page du site</h2>
      <div className="grid gap-6 sm:grid-cols-2">
        {TEMPLATES.map((t) => (
          <TemplateCard
            key={t.id}
            template={t}
            isSelected={templateId === t.id}
            onSelect={() => onTemplateChange(t.id)}
            paletteId={paletteId}
            onPaletteChange={onPaletteChange}
          />
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
  const [paletteId, setPaletteId] = useState<string | null>(null);
  const [draftPaletteId, setDraftPaletteId] = useState<string | null>(null);

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
      .then((data: { templateId: TemplateId; paletteId: string | null }) => {
        setTemplateId(data.templateId);
        setDraftTemplateId(data.templateId);
        setPaletteId(data.paletteId);
        setDraftPaletteId(data.paletteId);
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

  const draftTemplateDef = TEMPLATES.find((t) => t.id === draftTemplateId);
  const draftPalettesAvailable = draftTemplateDef?.palettes ?? [];

  const handleTemplateChange = (id: TemplateId) => {
    setDraftTemplateId(id);
    const palettes = TEMPLATES.find((t) => t.id === id)?.palettes ?? [];
    if (palettes.length > 0 && !palettes.some((p) => p.id === draftPaletteId)) {
      setDraftPaletteId(palettes[0].id);
    }
  };

  const templateDirty = draftTemplateId !== null && draftTemplateId !== templateId;
  const paletteDirty = draftPalettesAvailable.length > 0 && draftPaletteId !== paletteId;
  const contentDirty = Boolean(content && (siteName !== content.siteName || description !== content.description));
  const isDirty = templateDirty || paletteDirty || contentDirty;

  const handleSave = async () => {
    setSaveStatus("saving");

    const requests: Promise<Response>[] = [];

    if ((templateDirty || paletteDirty) && draftTemplateId) {
      requests.push(
        adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/template`, password, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateId: draftTemplateId, paletteId: draftPaletteId }),
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
            googlePlaceId: content.googlePlaceId,
            googlePlaceName: content.googlePlaceName,
            openingHours: content.openingHours,
          }),
        })
      );
    }

    const results = await Promise.all(requests);
    const allOk = results.every((res) => res.ok);

    if ((templateDirty || paletteDirty) && draftTemplateId) {
      setTemplateId(draftTemplateId);
      setPaletteId(draftPaletteId);
    }
    if (contentDirty) {
      const contentRes = results[templateDirty || paletteDirty ? 1 : 0];
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

      {activeTab === "template" && (
        <TemplateTab
          templateId={draftTemplateId}
          onTemplateChange={handleTemplateChange}
          paletteId={draftPaletteId}
          onPaletteChange={setDraftPaletteId}
        />
      )}
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
