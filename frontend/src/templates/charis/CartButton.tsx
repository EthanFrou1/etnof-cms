import { createPortal } from "react-dom";
import { t, type Locale } from "@modules/multilingue/frontend/translations";
import { useCart } from "@modules/catalogue/frontend/CartContext";
import type { ModulePalette } from "./ProductCard";

// En portail (document.body) plutôt qu'en place : un bouton `position: fixed` niché dans une bande
// animée (voir `Reveal`/`Band` de TemplateHestia/Helios) se retrouverait positionné par rapport à
// l'ancêtre transformé plutôt que par rapport à la fenêtre — même raison que CartButton dans
// modules/catalogue/frontend/CatalogueSection.tsx. Réutilisé par le teaser home, la page boutique et
// la fiche produit.
export default function CartButton({ clientSiteId, palette, locale }: { clientSiteId: string; palette: ModulePalette; locale?: Locale }) {
  const { itemCount } = useCart();

  return createPortal(
    <a
      href={`/t/${clientSiteId}/panier`}
      // bottom-24 en dessous de sm : laisse la place à la barre sticky "Ajouter au panier" de la
      // fiche produit (ProductPage.tsx, visible uniquement sm:hidden) sans se superposer — au-delà
      // de sm cette barre n'existe pas, on revient à bottom-6.
      className="fixed bottom-24 right-6 z-40 flex items-center gap-2 rounded-pill px-5 py-3 text-sm font-semibold text-white shadow-soft sm:bottom-6"
      style={{ backgroundColor: palette.ink }}
    >
      {t(locale, "catalogue.cart")} {itemCount > 0 && `(${itemCount})`}
    </a>,
    document.body
  );
}
