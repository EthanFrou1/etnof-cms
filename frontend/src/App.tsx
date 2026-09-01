import { lazy, Suspense, useEffect, useState } from "react";
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
import LegalNoticePage from "./pages/LegalNoticePage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TenantInvitationPage from "./pages/TenantInvitationPage";
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
  "fidelite",
  "accounts",
  "history",
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

// Rendu du site public d'UN tenant déjà résolu, à partir des segments d'URL qui suivent son
// identifiant — utilisé aussi bien par /t/{clientSiteId}/... (lien de prévisualisation interne, voir
// plus bas) que par un domaine personnalisé de client résolu dynamiquement (voir DomainRouter
// ci-dessous et DomainEndpoints.cs côté backend) : mêmes pages, seule la façon d'obtenir
// `clientSiteId` change. Garder ces deux entrées synchronisées avec cette fonction plutôt qu'avec
// une liste de routes dupliquée.
function renderTenantSite(clientSiteId: string, segments: string[]) {
  // {clientSiteId}/blog/{slug} — détail d'article d'un tenant
  if (segments[0] === "blog" && segments[1]) {
    return (
      <Suspense fallback={null}>
        <BlogPostPage slug={segments[1]} apiBaseUrl={API_BASE_URL} clientSiteId={clientSiteId} />
      </Suspense>
    );
  }

  // {clientSiteId}/pages/{slug} — détail d'une page personnalisée d'un tenant
  if (segments[0] === "pages" && segments[1]) {
    return (
      <Suspense fallback={null}>
        <CustomPageView slug={segments[1]} apiBaseUrl={API_BASE_URL} clientSiteId={clientSiteId} />
      </Suspense>
    );
  }

  // {clientSiteId}/cgv — CGV du tenant, contenu "core" (SiteContent.CgvContent) pas un module,
  // voir CgvPage.tsx.
  if (segments[0] === "cgv") {
    return <CgvPage clientSiteId={clientSiteId} />;
  }

  // {clientSiteId}/mentions-legales et /confidentialite — même principe que /cgv ci-dessus :
  // contenu "core" (SiteContent.LegalNoticeContent/PrivacyPolicyContent), pas un module.
  if (segments[0] === "mentions-legales") {
    return <LegalNoticePage clientSiteId={clientSiteId} />;
  }
  if (segments[0] === "confidentialite") {
    return <PrivacyPolicyPage clientSiteId={clientSiteId} />;
  }

  // {clientSiteId}/produits/{productId} — fiche produit dédiée (grande photo + slider), exclusive
  // au template Charis, voir docs/10-templates.md
  if (segments[0] === "produits" && segments[1]) {
    return (
      <Suspense fallback={null}>
        <CharisProductPage clientSiteId={clientSiteId} productId={segments[1]} apiBaseUrl={API_BASE_URL} />
      </Suspense>
    );
  }

  // {clientSiteId}/boutique — page catalogue dédiée (tous les produits), riche avec filtre par
  // collection sur Charis, simple sur Hestia/Helios — voir docs/10-templates.md et
  // frontend/src/pages/CataloguePage.tsx (aiguilleur par template)
  if (segments[0] === "boutique") {
    return (
      <Suspense fallback={null}>
        <CataloguePage clientSiteId={clientSiteId} />
      </Suspense>
    );
  }

  // {clientSiteId}/panier — page panier du module Catalogue, identique pour tous les templates
  // (voir docs/10-templates.md)
  if (segments[0] === "panier") {
    return (
      <Suspense fallback={null}>
        <CartPage clientSiteId={clientSiteId} apiBaseUrl={API_BASE_URL} />
      </Suspense>
    );
  }

  // {clientSiteId}/commande — page de retour de Stripe Checkout (succès/annulation), voir
  // CheckoutResultPage.tsx. CartPage.tsx y pointe son `returnBaseUrl` ; remplace l'ancienne bannière
  // affichée sur la home (retirée de CatalogueSection.tsx et charis/ProductGrid.tsx).
  if (segments[0] === "commande") {
    return (
      <Suspense fallback={null}>
        <CheckoutResultPage clientSiteId={clientSiteId} apiBaseUrl={API_BASE_URL} />
      </Suspense>
    );
  }

  // {clientSiteId}/compte — module compte-client (connexion par lien email, historique de
  // commandes), identique pour tous les templates (même principe que /panier). Gère elle-même le
  // paramètre ?token= du lien de connexion reçu par email.
  if (segments[0] === "compte") {
    return (
      <Suspense fallback={null}>
        <AccountPage clientSiteId={clientSiteId} apiBaseUrl={API_BASE_URL} />
      </Suspense>
    );
  }

  // Rien de plus spécifique : la home du tenant.
  return <PublicSite clientSiteId={clientSiteId} />;
}

// Accès par nom de domaine personnalisé (voir docs/08-hebergement-domaines.md) : le nom d'hôte n'est
// pas un GUID connu à l'avance comme /t/{clientSiteId}, donc il faut d'abord demander au backend à
// quel tenant il correspond (GET /api/domain-resolve, voir backend/DomainEndpoints.cs) avant de
// savoir quoi afficher — d'où l'aller-retour réseau et l'état de chargement, contrairement au reste
// du routing ci-dessus qui reste synchrone. Un domaine inconnu (y compris le domaine de la
// plateforme elle-même, jamais enregistré comme CustomDomain d'un tenant) retombe sur le dashboard
// agence, comme l'absence de tenant dans l'URL plus bas.
function DomainRouter({ segments }: { segments: string[] }) {
  const [resolvedClientSiteId, setResolvedClientSiteId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/domain-resolve?host=${encodeURIComponent(window.location.hostname)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { clientSiteId: string } | null) => setResolvedClientSiteId(data?.clientSiteId ?? null))
      .catch(() => setResolvedClientSiteId(null));
  }, []);

  if (resolvedClientSiteId === undefined) return null; // le temps de l'aller-retour réseau
  if (resolvedClientSiteId === null) return <Redirect to="/admin/dashboard" />;
  return renderTenantSite(resolvedClientSiteId, segments);
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

  // /admin/{clientSiteId}/invitation?token=... — un compte Employé invité définit son mot de passe
  // (voir TenantAdminEndpoints.cs, comptes "Employé"), sort du switch section générique.
  if (segments[0] === "admin" && segments[1] && segments[2] === "invitation") {
    return <TenantInvitationPage clientSiteId={segments[1]} />;
  }

  // /admin/{clientSiteId}/{section} — admin d'UN tenant (section par défaut : dashboard)
  if (segments[0] === "admin" && segments[1]) {
    const requested = segments[2] as AdminSection | undefined;
    const section = requested && ADMIN_SECTIONS.includes(requested) ? requested : "dashboard";
    return <AdminPage clientSiteId={segments[1]} section={section} />;
  }

  // /t/{clientSiteId}/... — lien de prévisualisation interne d'un tenant (jamais l'URL d'un vrai
  // client en prod, voir docs/08-hebergement-domaines.md). Toutes les sous-pages sont gérées par
  // renderTenantSite ci-dessus, partagée avec la résolution par domaine personnalisé juste en dessous.
  if (segments[0] === "t" && segments[1]) {
    return renderTenantSite(segments[1], segments.slice(2));
  }

  // Rien de reconnu ci-dessus (y compris "/" tout seul) : soit ce nom de domaine est celui d'un
  // client (voir DomainRouter), soit c'est le domaine de la plateforme elle-même ou un domaine
  // inconnu — DomainRouter retombe alors sur la vue globale d'Ethan. localhost/127.0.0.1 exclus de
  // cette tentative : rien d'utile à résoudre en dev, on va direct au repli habituel.
  const hostname = window.location.hostname;
  if (hostname !== "localhost" && hostname !== "127.0.0.1") {
    return <DomainRouter segments={segments} />;
  }

  return <Redirect to="/admin/dashboard" />;
}

export default App;
