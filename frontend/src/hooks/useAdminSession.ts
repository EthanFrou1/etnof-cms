import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";

// Au plus un renouvellement toutes les 5 minutes d'activité — pas la peine d'appeler l'endpoint à
// chaque frappe/mousemove, le token a de toute façon encore près d'1h devant lui la plupart du temps.
const REFRESH_THROTTLE_MS = 5 * 60 * 1000;

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

// Lit le scope porté par le token (voir backend/AdminToken.cs, TokenPayload — sérialisé en PascalCase
// brut, pas passé par les options JSON camelCase de l'API HTTP habituelle) sans vérifier sa signature
// : lecture cosmétique côté client pour masquer les sections réservées au Propriétaire dans la nav
// (voir AdminLayout.tsx). Ne remplace pas la vraie protection — le backend revalide la signature et
// le scope sur chaque endpoint sensible (TenantAdminAuth.IsOwnerAuthorizedAsync), un token trafiqué
// ne débloquerait donc jamais rien de réel, juste l'affichage local.
export function decodeTokenScope(token: string): string | null {
  try {
    const payloadPart = token.split(".")[0];
    const padded = payloadPart.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (payloadPart.length % 4)) % 4);
    const parsed = JSON.parse(atob(padded)) as { Scope?: string };
    return parsed.Scope ?? null;
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

  // Prolonge la session tant que l'utilisateur reste actif sur la page — sans ça le token expire au
  // bout d'1h pile même en pleine utilisation (voir backend/AdminToken.cs, Ttl fixe). Resté
  // totalement inactif, aucun événement ne se déclenche : le token expire normalement et
  // readSession() ci-dessus renvoie null au prochain chargement (déconnexion après 1h d'inactivité).
  // La navigation admin se fait par rechargement complet de page (liens <a>, pas de routeur côté
  // client — voir AdminLayout.tsx), donc ces écouteurs n'ont besoin de vivre que pour la page en cours.
  useEffect(() => {
    if (!session) return;
    let lastRefresh = Date.now();

    const refresh = () => {
      const now = Date.now();
      if (now - lastRefresh < REFRESH_THROTTLE_MS) return;
      lastRefresh = now;

      fetch(`${API_BASE_URL}/api/admin/refresh-token`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { token: string; expiresAt: number } | null) => {
          if (data) login(data.token, data.expiresAt);
        })
        .catch(() => {});
    };

    const events: (keyof WindowEventMap)[] = ["mousemove", "keydown", "click", "scroll"];
    events.forEach((e) => window.addEventListener(e, refresh, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, refresh));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token]);

  const tokenScope = session ? decodeTokenScope(session.token) : null;

  return {
    password: session?.token ?? null,
    // false tant que la session n'est pas encore connue (évite un flash "Employé" avant le premier
    // rendu) — mêmes conventions que modules === null ailleurs dans l'admin.
    isEmployee: tokenScope === "tenant-employee",
    login,
  };
}

// Déconnexion — juste effacer la session stockée, pas d'appel serveur (les tokens sont sans état,
// voir AdminToken.cs). Exportée à part (comme decodeTokenScope) pour que AdminLayout.tsx/
// AgencyLayout.tsx puissent l'appeler directement au clic sans avoir à faire remonter `logout` en
// prop depuis chacune des pages qui appellent useAdminSession (AdminPage.tsx, ProductDetailPage.tsx…).
export function clearSession(scope: string) {
  sessionStorage.removeItem(storageKey(scope));
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
