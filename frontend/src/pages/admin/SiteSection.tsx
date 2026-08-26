import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import type { SiteContent } from "../../hooks/useContent";
import type { TemplateId } from "../../hooks/useTemplate";
import { adminFetch } from "../../hooks/useAdminSession";
import { TEMPLATES, resolvePalette } from "../../templates/registry";
import RichTextEditor from "../../components/admin/RichTextEditor";

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
  customAccent,
}: {
  template: (typeof TEMPLATES)[number];
  isSelected: boolean;
  onSelect: () => void;
  paletteId: string | null;
  customAccent: string | null;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  // Sélecteur de palette retiré de l'UI (voir SiteSection.handleTemplateChange) — chaque template
  // garde sa 1re palette. La card du template sélectionné suit quand même paletteId/customAccent tels
  // que chargés, au cas où un site aurait déjà une palette non-défaut enregistrée avant ce retrait.
  // Pour "custom", pas d'image dédiée (le fond reste celui du 1er preset, voir resolvePalette) — le
  // dégradé de repli (fallbackGradient) reprend la couleur déjà enregistrée pour ce site.
  const activePalette =
    isSelected && template.palettes.length > 0
      ? resolvePalette(template.id, paletteId, customAccent)
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
  customAccent,
}: {
  templateId: TemplateId | null;
  onTemplateChange: (id: TemplateId) => void;
  paletteId: string | null;
  customAccent: string | null;
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
            customAccent={customAccent}
          />
        ))}
      </div>
    </section>
  );
}

function ContentTab({
  siteName,
  description,
  storyContent,
  onSiteNameChange,
  onDescriptionChange,
  onStoryContentChange,
}: {
  siteName: string;
  description: string;
  storyContent: string;
  onSiteNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onStoryContentChange: (value: string) => void;
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
        <div className="flex flex-col gap-1 text-sm font-medium text-gray-text">
          Description
          <RichTextEditor value={description} onChange={onDescriptionChange} compact />
        </div>
        <div className="flex flex-col gap-1 text-sm font-medium text-gray-text">
          Notre histoire
          <p className="text-xs font-normal text-gray-text/80">
            Texte plus long affiché dans une section dédiée sur le site (pour l'instant : template
            Charis uniquement) — utile pour rassurer le client sur ton activité. Laisse vide pour ne
            pas afficher cette section.
          </p>
          <RichTextEditor value={storyContent} onChange={onStoryContentChange} compact />
        </div>
      </div>
    </section>
  );
}

export default function SiteSection({ clientSiteId, password }: SiteSectionProps) {
  // Permet un lien profond vers l'onglet Contenu (ex. raccourci "Ajouter une description du site"
  // du tableau de bord, voir DashboardSection.tsx) sans routeur dédié : App.tsx ne lit que le path,
  // le hash reste donc disponible pour ce genre de préférence d'affichage au chargement.
  const [activeTab, setActiveTab] = useState<TabId>(() => (window.location.hash === "#content" ? "content" : "template"));

  const [templateId, setTemplateId] = useState<TemplateId | null>(null);
  const [draftTemplateId, setDraftTemplateId] = useState<TemplateId | null>(null);
  const [paletteId, setPaletteId] = useState<string | null>(null);
  const [draftPaletteId, setDraftPaletteId] = useState<string | null>(null);
  const [customAccent, setCustomAccent] = useState<string | null>(null);
  const [draftCustomAccent, setDraftCustomAccent] = useState<string | null>(null);

  // Tous les autres champs de SiteContent (établissement, offres…) sont édités sur d'autres pages
  // mais partagés avec elles via le même endpoint PUT /admin/content, qui remplace tout l'objet —
  // il faut donc les renvoyer tels que chargés pour ne pas les écraser à vide.
  const [content, setContent] = useState<SiteContent | null>(null);
  const [siteName, setSiteName] = useState("");
  const [description, setDescription] = useState("");
  const [storyContent, setStoryContent] = useState("");

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Distinct de saveStatus : "Enregistrer" écrit le brouillon (ce que l'admin voit ici), "Rafraîchir
  // le site" copie ce brouillon vers le site public (voir PublishEndpoints.cs) — tant que ce bouton
  // n'est pas cliqué, le site public continue d'afficher l'ancienne version publiée.
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [publishStatus, setPublishStatus] = useState<"idle" | "publishing" | "error">("idle");

  useEffect(() => {
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/publish-status`, password)
      .then((res) => res.json())
      .then((data: { publishedAt: string | null }) => setPublishedAt(data.publishedAt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePublish = async () => {
    setPublishStatus("publishing");
    const res = await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/publish`, password, { method: "POST" });
    if (res.ok) {
      const data = (await res.json()) as { publishedAt: string };
      setPublishedAt(data.publishedAt);
      setPublishStatus("idle");
    } else {
      setPublishStatus("error");
    }
  };

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/t/${clientSiteId}/template`)
      .then((res) => res.json())
      .then((data: { templateId: TemplateId; paletteId: string | null; customAccent: string | null }) => {
        setTemplateId(data.templateId);
        setDraftTemplateId(data.templateId);
        setPaletteId(data.paletteId);
        setDraftPaletteId(data.paletteId);
        setCustomAccent(data.customAccent);
        setDraftCustomAccent(data.customAccent);
      });
    fetch(`${API_BASE_URL}/api/t/${clientSiteId}/content`)
      .then((res) => res.json())
      .then((data: SiteContent) => {
        setContent(data);
        setSiteName(data.siteName);
        setDescription(data.description);
        setStoryContent(data.storyContent);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const draftTemplateDef = TEMPLATES.find((t) => t.id === draftTemplateId);
  const draftPalettesAvailable = draftTemplateDef?.palettes ?? [];

  const handleTemplateChange = (id: TemplateId) => {
    setDraftTemplateId(id);
    // "custom" reste valable sur n'importe quel template (couleur libre, pas un preset du modèle) —
    // seul un id de preset devenu invalide pour le nouveau template déclenche un repli.
    if (draftPaletteId === "custom") return;
    const palettes = TEMPLATES.find((t) => t.id === id)?.palettes ?? [];
    if (palettes.length > 0 && !palettes.some((p) => p.id === draftPaletteId)) {
      setDraftPaletteId(palettes[0].id);
    }
  };

  const templateDirty = draftTemplateId !== null && draftTemplateId !== templateId;
  const paletteDirty =
    draftPaletteId === "custom"
      ? paletteId !== "custom" || draftCustomAccent !== customAccent
      : draftPalettesAvailable.length > 0 && draftPaletteId !== paletteId;
  const contentDirty = Boolean(
    content && (siteName !== content.siteName || description !== content.description || storyContent !== content.storyContent)
  );
  const isDirty = templateDirty || paletteDirty || contentDirty;

  const handleSave = async () => {
    setSaveStatus("saving");

    const requests: Promise<Response>[] = [];

    if ((templateDirty || paletteDirty) && draftTemplateId) {
      requests.push(
        adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/template`, password, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateId: draftTemplateId, paletteId: draftPaletteId, customAccent: draftCustomAccent }),
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
            storyContent,
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
            cgvContent: content.cgvContent,
          }),
        })
      );
    }

    const results = await Promise.all(requests);
    const allOk = results.every((res) => res.ok);

    if ((templateDirty || paletteDirty) && draftTemplateId) {
      setTemplateId(draftTemplateId);
      setPaletteId(draftPaletteId);
      setCustomAccent(draftCustomAccent);
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

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-white p-5 shadow-card">
        <div>
          <p className="text-sm font-semibold text-navy">Rafraîchir le site public</p>
          <p className="text-xs text-gray-text">
            Les modifications enregistrées ci-dessus ne sont visibles sur le site public qu'après ce rafraîchissement.
          </p>
          <p className="mt-1 text-xs text-gray-text">
            {publishedAt
              ? `Dernière publication : ${new Date(publishedAt).toLocaleString("fr-FR")}`
              : "Jamais publié"}
          </p>
          {publishStatus === "error" && <p className="text-xs text-red-500">Erreur lors de la publication.</p>}
        </div>
        <button
          type="button"
          onClick={handlePublish}
          disabled={publishStatus === "publishing"}
          className="rounded-button border border-brand-mid px-4 py-2.5 font-semibold text-brand-mid transition-colors hover:bg-brand-mid/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {publishStatus === "publishing" ? "Publication…" : "Rafraîchir le site"}
        </button>
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
          customAccent={draftCustomAccent}
        />
      )}
      {activeTab === "content" && (
        <ContentTab
          siteName={siteName}
          description={description}
          storyContent={storyContent}
          onSiteNameChange={setSiteName}
          onDescriptionChange={setDescription}
          onStoryContentChange={setStoryContent}
        />
      )}
    </div>
  );
}
