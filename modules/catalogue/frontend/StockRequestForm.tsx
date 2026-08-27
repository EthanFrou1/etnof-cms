import { useState } from "react";
import { createPortal } from "react-dom";
import { t, type Locale } from "@modules/multilingue/frontend/translations";

// Voir docs/10-templates.md : un module reste isolé, redéclare localement la forme de la palette
// du template actif plutôt que d'importer PaletteDef.
type ModulePalette = { accent: string; background: string; ink: string };

type StockRequestFormProps = {
  apiBaseUrl: string;
  clientSiteId: string;
  productId: string;
  productName: string;
  // Null pour une rupture globale (produit sans tailles, ou aucune taille sélectionnée alors que
  // toutes sont épuisées) — voir StockRequest.cs côté backend.
  sizeLabel?: string | null;
  palette: ModulePalette;
  locale?: Locale;
};

// "Prévenez-moi" affiché quand un produit (ou une taille précise) est en rupture — voir
// StockRequest.cs. Partagé entre Charis (ProductPage.tsx) et Hestia/Helios (CatalogueSection.tsx),
// même principe que CartContext : composant commun au module plutôt que dupliqué par template.
// Ouvre une vraie modale (portail, même patron que ProductReviewModal/ConfirmModal) plutôt qu'un
// lien discret révélant un mini-formulaire en place — trop peu visible d'après le retour d'Ethan
// sur une première version, en particulier dans l'espace compact d'une card produit.
export default function StockRequestForm({
  apiBaseUrl,
  clientSiteId,
  productId,
  productName,
  sizeLabel,
  palette,
  locale,
}: StockRequestFormProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    const res = await fetch(`${apiBaseUrl}/api/t/${clientSiteId}/catalogue/products/${productId}/stock-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, sizeLabel: sizeLabel ?? null }),
    });
    setStatus(res.ok ? "sent" : "error");
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className="w-fit rounded-button border px-4 py-2 text-sm font-semibold transition-colors hover:bg-black/[0.03]"
        style={{ borderColor: palette.accent, color: palette.accent }}
      >
        {t(locale, "catalogue.notifyMe")}
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          >
            <div
              className="w-full max-w-sm rounded-card bg-white p-6 shadow-soft"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-1 flex items-start justify-between gap-3">
                <h2 className="text-lg font-bold text-navy">{t(locale, "catalogue.notifyMe")}</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-xl leading-none text-gray-text hover:text-navy"
                >
                  ×
                </button>
              </div>
              <p className="mb-4 text-sm text-gray-text">
                {productName}
                {sizeLabel ? ` — ${t(locale, "catalogue.size")} ${sizeLabel}` : ""}
              </p>

              {status === "sent" ? (
                <p className="text-sm font-medium text-navy">{t(locale, "catalogue.stockRequestSent")}</p>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                  <input
                    type="email"
                    required
                    placeholder={t(locale, "catalogue.notifyMeEmailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-button border border-border-subtle px-3 py-2 text-sm text-navy placeholder:text-gray-text/60 focus:outline-none focus:ring-2 focus:ring-brand-mid/20"
                  />
                  {status === "error" && <p className="text-sm text-red-500">{t(locale, "catalogue.notifyMeError")}</p>}
                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="self-start rounded-button px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: palette.accent }}
                  >
                    {status === "sending" ? "…" : t(locale, "catalogue.notifyMeSubmit")}
                  </button>
                </form>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
