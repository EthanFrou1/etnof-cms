import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";

export type EstablishmentImage = {
  id: string;
  clientSiteId: string;
  path: string;
  sortOrder: number;
};

export function useEstablishmentImages(clientSiteId: string) {
  const [images, setImages] = useState<EstablishmentImage[]>([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/t/${clientSiteId}/establishment/images`)
      .then((res) => res.json())
      .then(setImages)
      .catch((err) => console.error("Erreur useEstablishmentImages :", err));
  }, [clientSiteId]);

  return images;
}
