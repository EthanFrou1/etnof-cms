import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";

export type TemplateId = "hestia" | "helios" | "charis";

export function useTemplate(clientSiteId: string) {
  const [templateId, setTemplateId] = useState<TemplateId | null>(null);
  const [paletteId, setPaletteId] = useState<string | null>(null);
  const [customAccent, setCustomAccent] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/t/${clientSiteId}/template/published`)
      .then((res) => res.json())
      .then((data: { templateId: TemplateId; paletteId: string | null; customAccent: string | null; logoUrl: string | null }) => {
        setTemplateId(data.templateId);
        setPaletteId(data.paletteId);
        setCustomAccent(data.customAccent);
        setLogoUrl(data.logoUrl);
      })
      .catch((err) => console.error("Erreur useTemplate :", err));
  }, [clientSiteId]);

  return { templateId, paletteId, customAccent, logoUrl };
}
