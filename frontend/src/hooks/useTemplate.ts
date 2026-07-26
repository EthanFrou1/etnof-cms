import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";

export type TemplateId = "classique" | "moderne";

export function useTemplate(clientSiteId: string) {
  const [templateId, setTemplateId] = useState<TemplateId | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/t/${clientSiteId}/template`)
      .then((res) => res.json())
      .then((data: { templateId: TemplateId }) => setTemplateId(data.templateId))
      .catch((err) => console.error("Erreur useTemplate :", err));
  }, [clientSiteId]);

  return templateId;
}
