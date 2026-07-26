import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import type { ModulesConfig } from "../../hooks/useModules";
import type { SiteContent } from "../../hooks/useContent";
import type { TemplateId } from "../../hooks/useTemplate";
import { adminFetch } from "../../hooks/useAdminSession";
import { TEMPLATES } from "../../templates/registry";
import StatTile from "../../components/charts/StatTile";

type DashboardSectionProps = {
  clientSiteId: string;
  password: string;
};

export default function DashboardSection({ clientSiteId, password }: DashboardSectionProps) {
  const [modules, setModules] = useState<ModulesConfig | null>(null);
  const [content, setContent] = useState<SiteContent | null>(null);
  const [templateId, setTemplateId] = useState<TemplateId | null>(null);
  const [messageCount, setMessageCount] = useState<number | null>(null);

  useEffect(() => {
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/modules`, password)
      .then((res) => res.json())
      .then(setModules);

    fetch(`${API_BASE_URL}/api/t/${clientSiteId}/content`)
      .then((res) => res.json())
      .then(setContent);

    fetch(`${API_BASE_URL}/api/t/${clientSiteId}/template`)
      .then((res) => res.json())
      .then((data: { templateId: TemplateId }) => setTemplateId(data.templateId));

    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/messages`, password)
      .then((res) => res.json())
      .then((data: unknown[]) => setMessageCount(data.length));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enabledModuleCount = modules ? Object.values(modules).filter((m) => m.enabled).length : 0;
  const templateLabel = TEMPLATES.find((t) => t.id === templateId)?.label ?? "…";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold text-navy">Tableau de bord</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Modules actifs" value={modules ? enabledModuleCount : "…"} />
        <StatTile label="Offres" value={content ? content.offers.length : "…"} />
        <StatTile label="Messages reçus" value={messageCount ?? "…"} />
        <StatTile label="Mise en page" value={templateLabel} />
      </div>

      <section className="rounded-card bg-white p-8 shadow-card">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-green-accent">
          Mon site
        </span>
        <h2 className="mb-1 mt-1 text-xl font-extrabold text-navy">{content?.siteName ?? "…"}</h2>
        {content?.description && <p className="text-gray-text">{content.description}</p>}
        <a
          href={`/t/${clientSiteId}`}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block text-sm font-medium text-brand-mid hover:underline"
        >
          Voir le site public ↗
        </a>
      </section>
    </div>
  );
}
