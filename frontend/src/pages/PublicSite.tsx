import { useModules } from "../hooks/useModules";
import { useContent } from "../hooks/useContent";
import { useTemplate } from "../hooks/useTemplate";
import TemplateHestia from "../templates/TemplateHestia";
import TemplateHelios from "../templates/TemplateHelios";

type PublicSiteProps = {
  clientSiteId: string;
};

export default function PublicSite({ clientSiteId }: PublicSiteProps) {
  const modules = useModules(clientSiteId);
  const content = useContent(clientSiteId);
  const { templateId, paletteId } = useTemplate(clientSiteId);

  if (!templateId) return null;

  const props = { clientSiteId, modules, content, paletteId };

  return templateId === "helios" ? <TemplateHelios {...props} /> : <TemplateHestia {...props} />;
}
