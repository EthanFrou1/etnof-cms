import { lazy, Suspense, useEffect } from "react";
import PublicSite from "./pages/PublicSite";
import AdminPage from "./pages/AdminPage";
import AgencyPage from "./pages/AgencyPage";
import QuoteAcceptancePage from "./pages/QuoteAcceptancePage";
import InvoicePublicPage from "./pages/InvoicePublicPage";
import CustomerDetailPage from "./pages/CustomerDetailPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import BlogPostDetailPage from "./pages/BlogPostDetailPage";
import PageDetailPage from "./pages/PageDetailPage";
import CgvPage from "./pages/CgvPage";
import type { AdminSection } from "./components/admin/AdminLayout";
import type { AgencySection } from "./components/admin/AgencyLayout";
import { API_BASE_URL } from "./config";

const ADMIN_SECTIONS: AdminSection[] = [
  "dashboard",
  "site",
  "offers",
  "establishment",
  "modules",
  "products",
  "collections",
  "orders",
  "customers",
  "rdv",
  "newsletter",
  "avis-google",
  "stripe",
  "blog",
  "messages",
  "multilingue",
  "galerie",
  "pages",
];

const AGENCY_SECTIONS: AgencySection[] = [
  "dashboard",
  "tarifs",
  "sites",
  "entreprise",
  "clients",
  "formules",
  "devis",
  "factures",
  "paiement",
];

const BlogPostPage = lazy(() => import("@modules/blog/frontend/BlogPostPage"));
const CartPage = lazy(() => import("@modules/catalogue/frontend/CartPage"));
const CheckoutResultPage = lazy(() => import("@modules/catalogue/frontend/CheckoutResultPage"));
const AccountPage = lazy(() => import("@modules/compte-client/frontend/AccountPage"));
const CustomPageView = lazy(() => import("@modules/pages/frontend/CustomPageView"));
const CharisProductPage = lazy(() => import("./templates/charis/ProductPage"));
const CataloguePage = lazy(() => import("./pages/CataloguePage"));

function Redirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);
  return null;
}

function App() {
  const segments = window.location.pathname.split("/").filter(Boolean);

  // /devis/{id} — page publique d'acceptation d'un devis, sans auth (lien envoyé par email)
  if (segments[0] === "devis" && segments[1]) {
    return <QuoteAcceptancePage quoteId={segments[1]} />;
  }

  // /facture/{id} — page publique de paiement en ligne d'une facture, sans auth
  if (segments[0] === "facture" && segments[1]) {
    return <InvoicePublicPage invoiceId={segments[1]} />;
  }

  // /admin/dashboard/facturation — ancienne URL de la facturation, redirige vers l'onglet Entreprise
  // de l'espace agence fusionné (voir AgencyPage.tsx).
  if (segments[0] === "admin" && segments[1] === "dashboard" && segments[2] === "facturation") {
    return <Redirect to="/admin/dashboard/entreprise" />;
  }

  // /admin/dashboard(/{section}) — espace agence d'Ethan : vue globale, tarifs, sites clients,
  // facturation (section par défaut : dashboard). Voir AgencyLayout.tsx pour la nav.
  if (segments[0] === "admin" && segments[1] === "dashboard") {
    const requested = segments[2] as AgencySection | undefined;
    const section = requested && AGENCY_SECTIONS.includes(requested) ? requested : "dashboard";
    return <AgencyPage section={section} />;
  }

  // /admin/{clientSiteId}/customers/{customerId} — fiche d'UN client, sort du switch section générique
  if (segments[0] === "admin" && segments[1] && segments[2] === "customers" && segments[3]) {
    return <CustomerDetailPage clientSiteId={segments[1]} customerId={segments[3]} />;
  }

  // /admin/{clientSiteId}/products/{productId} — fiche d'UN produit, même principe que customers
  if (segments[0] === "admin" && segments[1] && segments[2] === "products" && segments[3]) {
    return <ProductDetailPage clientSiteId={segments[1]} productId={segments[3]} />;
  }

  // /admin/{clientSiteId}/blog/{postId} — fiche d'UN article, même principe que products/customers
  if (segments[0] === "admin" && segments[1] && segments[2] === "blog" && segments[3]) {
    return <BlogPostDetailPage clientSiteId={segments[1]} postId={segments[3]} />;
  }

  // /admin/{clientSiteId}/pages/{pageId} — fiche d'UNE page personnalisée, même principe que blog
  if (segments[0] === "admin" && segments[1] && segments[2] === "pages" && segments[3]) {
    return <PageDetailPage clientSiteId={segments[1]} pageId={segments[3]} />;
  }

  // /admin/{clientSiteId}/{section} — admin d'UN tenant (section par défaut : dashboard)
  if (segments[0] === "admin" && segments[1]) {
    const requested = segments[2] as AdminSection | undefined;
    const section = requested && ADMIN_SECTIONS.includes(requested) ? requested : "dashboard";
    return <AdminPage clientSiteId={segments[1]} section={section} />;
  }

  // /t/{clientSiteId}/blog/{slug} — détail d'article d'un tenant
  if (segments[0] === "t" && segments[1] && segments[2] === "blog" && segments[3]) {
    return (
      <Suspense fallback={null}>
        <BlogPostPage slug={segments[3]} apiBaseUrl={API_BASE_URL} clientSiteId={segments[1]} />
      </Suspense>
    );
  }

  // /t/{clientSiteId}/pages/{slug} — détail d'une page personnalisée d'un tenant
  if (segments[0] === "t" && segments[1] && segments[2] === "pages" && segments[3]) {
    return (
      <Suspense fallback={null}>
        <CustomPageView slug={segments[3]} apiBaseUrl={API_BASE_URL} clientSiteId={segments[1]} />
      </Suspense>
    );
  }

  // /t/{clientSiteId}/cgv — CGV du tenant, contenu "core" (SiteContent.CgvContent) pas un module,
  // voir CgvPage.tsx.
  if (segments[0] === "t" && segments[1] && segments[2] === "cgv") {
    return <CgvPage clientSiteId={segments[1]} />;
  }

  // /t/{clientSiteId}/produits/{productId} — fiche produit dédiée (grande photo + slider), exclusive
  // au template Charis, voir docs/10-templates.md
  if (segments[0] === "t" && segments[1] && segments[2] === "produits" && segments[3]) {
    return (
      <Suspense fallback={null}>
        <CharisProductPage clientSiteId={segments[1]} productId={segments[3]} apiBaseUrl={API_BASE_URL} />
      </Suspense>
    );
  }

  // /t/{clientSiteId}/boutique — page catalogue dédiée (tous les produits), riche avec filtre par
  // collection sur Charis, simple sur Hestia/Helios — voir docs/10-templates.md et
  // frontend/src/pages/CataloguePage.tsx (aiguilleur par template)
  if (segments[0] === "t" && segments[1] && segments[2] === "boutique") {
    return (
      <Suspense fallback={null}>
        <CataloguePage clientSiteId={segments[1]} />
      </Suspense>
    );
  }

  // /t/{clientSiteId}/panier — page panier du module Catalogue, identique pour tous les templates
  // (voir docs/10-templates.md)
  if (segments[0] === "t" && segments[1] && segments[2] === "panier") {
    return (
      <Suspense fallback={null}>
        <CartPage clientSiteId={segments[1]} apiBaseUrl={API_BASE_URL} />
      </Suspense>
    );
  }

  // /t/{clientSiteId}/commande — page de retour de Stripe Checkout (succès/annulation), voir
  // CheckoutResultPage.tsx. CartPage.tsx y pointe son `returnBaseUrl` ; remplace l'ancienne bannière
  // affichée sur la home (retirée de CatalogueSection.tsx et charis/ProductGrid.tsx).
  if (segments[0] === "t" && segments[1] && segments[2] === "commande") {
    return (
      <Suspense fallback={null}>
        <CheckoutResultPage clientSiteId={segments[1]} apiBaseUrl={API_BASE_URL} />
      </Suspense>
    );
  }

  // /t/{clientSiteId}/compte — module compte-client (connexion par lien email, historique de
  // commandes), identique pour tous les templates (même principe que /panier). Gère elle-même le
  // paramètre ?token= du lien de connexion reçu par email.
  if (segments[0] === "t" && segments[1] && segments[2] === "compte") {
    return (
      <Suspense fallback={null}>
        <AccountPage clientSiteId={segments[1]} apiBaseUrl={API_BASE_URL} />
      </Suspense>
    );
  }

  // /t/{clientSiteId} — site public d'un tenant
  if (segments[0] === "t" && segments[1]) {
    return <PublicSite clientSiteId={segments[1]} />;
  }

  // Pas de tenant dans l'URL (ex: "/") : rien à afficher côté site, direction la vue globale d'Ethan.
  return <Redirect to="/admin/dashboard" />;
}

export default App;
