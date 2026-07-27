import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";

export type TemplateId = "hestia" | "moderne";

export function useTemplate(clientSiteId: string) {
  const [templateId, setTemplateId] = useState<TemplateId | null>(null);
  const [paletteId, setPaletteId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/t/${clientSiteId}/template`)
      .then((res) => res.json())
      .then((data: { templateId: TemplateId; paletteId: string | null }) => {
        setTemplateId(data.templateId);
        setPaletteId(data.paletteId);
      })
      .catch((err) => console.error("Erreur useTemplate :", err));
  }, [clientSiteId]);

  return { templateId, paletteId };
}
