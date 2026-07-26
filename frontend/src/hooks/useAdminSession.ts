import { useState } from "react";

// `scope` isole le mot de passe en session par tenant (ou "agency" pour la vue globale d'Ethan),
// pour éviter qu'un mot de passe stocké pour un client ne se mélange avec un autre.
function storageKey(scope: string) {
  return `etnof-admin-password-${scope}`;
}

export function useAdminSession(scope: string) {
  const [password, setPassword] = useState<string | null>(() => sessionStorage.getItem(storageKey(scope)));

  const login = (pw: string) => {
    sessionStorage.setItem(storageKey(scope), pw);
    setPassword(pw);
  };

  return { password, login };
}

export async function adminFetch(apiBaseUrl: string, path: string, password: string, init?: RequestInit) {
  return fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      "X-Admin-Password": password,
    },
  });
}
