import { lazy, Suspense } from "react";
import { useModules } from "../hooks/useModules";
import { useContent } from "../hooks/useContent";
import { useTemplate } from "../hooks/useTemplate";
import { useLocale } from "../hooks/useLocale";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import TemplateHestia from "../templates/TemplateHestia";
import TemplateHelios from "../templates/TemplateHelios";

const CookieConsentBanner = lazy(() => import("@modules/analytics/frontend/CookieConsentBanner"));

type PublicSiteProps = {
  clientSiteId: string;
};

export default function PublicSite({ clientSiteId }: PublicSiteProps) {
  const modules = useModules(clientSiteId);
  const { locale, setLocale } = useLocale(clientSiteId);
  const content = useContent(clientSiteId, locale);
  const { templateId, paletteId, customAccent } = useTemplate(clientSiteId);

  useDocumentMeta({
    title: content?.siteName || "…",
    description: content?.description,
  });

  if (!templateId) return null;

  const props = { clientSiteId, modules, content, paletteId, customAccent, locale, onChangeLocale: setLocale };
  const measurementId = modules?.analytics?.measurementId;

  return (
    <>
      {templateId === "helios" ? <TemplateHelios {...props} /> : <TemplateHestia {...props} />}
      {modules?.analytics?.enabled && typeof measurementId === "string" && (
        <Suspense fallback={null}>
          <CookieConsentBanner clientSiteId={clientSiteId} measurementId={measurementId} locale={locale} />
        </Suspense>
      )}
    </>
  );
}
