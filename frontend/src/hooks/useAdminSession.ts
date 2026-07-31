import { useState } from "react";

// `scope` isole la session en storage par tenant (ou "agency" pour la vue globale d'Ethan), pour
// éviter qu'une session stockée pour un client ne se mélange avec un autre.
function storageKey(scope: string) {
  return `etnof-admin-session-${scope}`;
}

type StoredSession = { token: string; expiresAt: number };

function readSession(scope: string): StoredSession | null {
  const raw = sessionStorage.getItem(storageKey(scope));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as StoredSession;
    // Expiration côté client (le backend rejette de toute façon un token expiré) : évite de garder
    // affiché un écran admin avec un token mort après 1h, l'utilisateur retombe sur l'écran de login.
    if (Date.now() >= parsed.expiresAt * 1000) {
      sessionStorage.removeItem(storageKey(scope));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function useAdminSession(scope: string) {
  const [session, setSession] = useState<StoredSession | null>(() => readSession(scope));

  const login = (token: string, expiresAt: number) => {
    const next = { token, expiresAt };
    sessionStorage.setItem(storageKey(scope), JSON.stringify(next));
    setSession(next);
  };

  return { password: session?.token ?? null, login };
}

export async function adminFetch(apiBaseUrl: string, path: string, token: string, init?: RequestInit) {
  return fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}
