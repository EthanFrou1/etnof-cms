import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";

export type Offer = {
  id: string;
  title: string;
  price: string;
  description: string;
};

export type SiteContent = {
  id: string;
  clientSiteId: string;
  siteName: string;
  description: string;
  offers: Offer[];
  establishmentName: string;
  establishmentType: string;
  address: string;
  phone: string;
};

export function useContent(clientSiteId: string) {
  const [content, setContent] = useState<SiteContent | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/t/${clientSiteId}/content`)
      .then((res) => res.json())
      .then((data: SiteContent) => setContent(data))
      .catch((err) => console.error("Erreur useContent :", err));
  }, [clientSiteId]);

  return content;
}
