import { useModules } from "../hooks/useModules";
import { useContent } from "../hooks/useContent";
import { useTemplate } from "../hooks/useTemplate";
import { useLocale } from "../hooks/useLocale";
import TemplateHestia from "../templates/TemplateHestia";
import TemplateHelios from "../templates/TemplateHelios";

type PublicSiteProps = {
  clientSiteId: string;
};

export default function PublicSite({ clientSiteId }: PublicSiteProps) {
  const modules = useModules(clientSiteId);
  const { locale, setLocale } = useLocale(clientSiteId);
  const content = useContent(clientSiteId, locale);
  const { templateId, paletteId } = useTemplate(clientSiteId);

  if (!templateId) return null;

  const props = { clientSiteId, modules, content, paletteId, locale, onChangeLocale: setLocale };

  return templateId === "helios" ? <TemplateHelios {...props} /> : <TemplateHestia {...props} />;
}
