import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";

export type ModuleConfig = { enabled: boolean; [key: string]: unknown };
export type ModulesConfig = Record<string, ModuleConfig>;

export function useModules(clientSiteId: string) {
  const [modules, setModules] = useState<ModulesConfig | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/t/${clientSiteId}/config/modules`)
      .then((res) => res.json())
      .then((data: ModulesConfig) => {
        console.log("Modules actifs :", data);
        setModules(data);
      })
      .catch((err) => console.error("Erreur useModules :", err));
  }, [clientSiteId]);

  return modules;
}
