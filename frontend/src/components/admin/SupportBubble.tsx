import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import { adminFetch } from "../../hooks/useAdminSession";
import { IconClose, IconHelp } from "./icons";

type SupportBubbleProps = {
  clientSiteId: string;
  password: string;
  // Adresse mail publique du site (page Établissement), si renseignée — préremplit le champ de
  // retour pour éviter au client de la retaper à chaque fois.
  defaultEmail?: string;
};

type Status = "idle" | "sending" | "sent" | "error";

// Bulle d'aide visible sur toutes les pages de l'admin client (branchée une seule fois dans
// AdminLayout.tsx) — envoie un vrai email à l'agence via Brevo (backend/BrevoEmailService.cs),
// plutôt qu'un simple lien mailto: qui sortirait le client de l'admin.
export default function SupportBubble({ clientSiteId, password, defaultEmail }: SupportBubbleProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [replyToEmail, setReplyToEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  // `defaultEmail` arrive après coup (fetch du contenu dans AdminLayout) — préremplit sans écraser
  // une saisie déjà en cours si le client l'a modifié entre-temps.
  useEffect(() => {
    if (defaultEmail) setReplyToEmail((current) => current || defaultEmail);
  }, [defaultEmail]);

  const reset = () => {
    setOpen(false);
    setMessage("");
    setReplyToEmail(defaultEmail ?? "");
    setStatus("idle");
    setError("");
  };

  const handleSend = async () => {
    setStatus("sending");
    setError("");

    const res = await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/support`, password, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, replyToEmail: replyToEmail || null }),
    });

    if (res.ok) {
      setStatus("sent");
    } else {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Envoi indisponible pour le moment.");
      setStatus("error");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-pill bg-brand-gradient px-5 py-3 text-sm font-semibold text-white shadow-soft transition-transform hover:scale-105"
      >
        <IconHelp className="h-5 w-5" />
        Aide
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4" onClick={reset}>
          <div
            className="w-full max-w-sm rounded-card bg-white p-6 shadow-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy">Besoin d'aide ?</h2>
              <button type="button" onClick={reset} className="text-gray-text hover:text-navy" aria-label="Fermer">
                <IconClose className="h-5 w-5" />
              </button>
            </div>

            {status === "sent" ? (
              <p className="mt-4 text-sm leading-relaxed text-gray-text">
                Message envoyé, on te répond vite !
              </p>
            ) : (
              <>
                <p className="mt-2 text-sm leading-relaxed text-gray-text">
                  Décris ton problème, on reçoit ton message directement par email.
                </p>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Ton message…"
                  className="mt-4 w-full rounded-button border border-border-subtle px-3 py-2 text-sm text-navy placeholder:text-gray-text/60 focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20"
                />
                <input
                  type="email"
                  value={replyToEmail}
                  onChange={(e) => setReplyToEmail(e.target.value)}
                  placeholder="Ton email, pour qu'on puisse te répondre (facultatif)"
                  className="mt-2 w-full rounded-button border border-border-subtle px-3 py-2 text-sm text-navy placeholder:text-gray-text/60 focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20"
                />

                {status === "error" && <p className="mt-2 text-sm text-red-500">{error}</p>}

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={reset}
                    className="rounded-button border border-border-subtle px-4 py-2.5 font-semibold text-gray-text hover:bg-bg-page-start"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!message.trim() || status === "sending"}
                    className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    {status === "sending" ? "Envoi…" : "Envoyer"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
