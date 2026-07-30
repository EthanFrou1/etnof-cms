import { useState } from "react";
import { API_BASE_URL } from "../../config";
import { adminFetch } from "../../hooks/useAdminSession";

// Traduction automatique (DeepL, voir docs/12-plan-modules-restants.md) — partagé entre toutes les
// pages admin qui traduisent du contenu tenant (MultilingueSection, Avis Google...) pour éviter de
// dupliquer ce helper + ce bouton à chaque fois. Un seul appel pour plusieurs champs d'un coup.
export async function translateTexts(
  clientSiteId: string,
  password: string,
  texts: string[],
  locale: "en" | "es"
): Promise<string[]> {
  const res = await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/multilingue/translate`, password, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts, targetLocale: locale }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "Traduction automatique indisponible.");
  }
  const data = await res.json();
  return data.translated as string[];
}

// Enregistre directement après la traduction (décision d'Ethan) : `onTranslate` doit lui-même
// persister le résultat, pas seulement préremplir un brouillon.
export default function AutoTranslateButton({ onTranslate }: { onTranslate: () => Promise<void> }) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  const handleClick = async () => {
    setStatus("loading");
    try {
      await onTranslate();
      setStatus("idle");
    } catch {
      setStatus("error");
      setTimeout(() => setStatus((c) => (c === "error" ? "idle" : c)), 2500);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status === "loading"}
      className="rounded-button border border-border-subtle px-3 py-1.5 text-sm font-medium text-brand-mid transition-opacity hover:bg-bg-page-start disabled:cursor-not-allowed disabled:opacity-40"
    >
      {status === "loading" ? "Traduction…" : status === "error" ? "Échec — réessayer" : "✨ Traduire automatiquement"}
    </button>
  );
}
