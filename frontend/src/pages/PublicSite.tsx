import { useModules } from "../hooks/useModules";
import { useContent } from "../hooks/useContent";
import { useTemplate } from "../hooks/useTemplate";
import TemplateClassique from "../templates/TemplateClassique";
import TemplateModerne from "../templates/TemplateModerne";

type PublicSiteProps = {
  clientSiteId: string;
};

export default function PublicSite({ clientSiteId }: PublicSiteProps) {
  const modules = useModules(clientSiteId);
  const content = useContent(clientSiteId);
  const templateId = useTemplate(clientSiteId);

  if (!templateId) return null;

  const props = { clientSiteId, modules, content };

  return templateId === "moderne" ? <TemplateModerne {...props} /> : <TemplateClassique {...props} />;
}
