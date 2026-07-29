import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";

export type Offer = {
  id: string;
  title: string;
  price: string;
  description: string;
  // Lien facultatif vers un produit du module Catalogue — voir OffersSection.tsx, null pour un
  // tenant sans ce module ou pour une offre restée en texte libre.
  productId: string | null;
};

// Horaires d'un jour : deux plages pour permettre une pause méridienne — une plage vide ("")
// signifie qu'elle ne s'applique pas (pas de coupure, ou jour fermé).
export type DayHours = {
  closed: boolean;
  morningOpen: string;
  morningClose: string;
  afternoonOpen: string;
  afternoonClose: string;
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
  email: string;
  managerName: string;
  managerPhone: string;
  managerEmail: string;
  openingHours: DayHours[];
  googlePlaceId: string;
  googlePlaceName: string;
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
