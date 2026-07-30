import { lazy, Suspense, useEffect } from "react";
import PublicSite from "./pages/PublicSite";
import AdminPage from "./pages/AdminPage";
import AgencyDashboardPage from "./pages/AgencyDashboardPage";
import AgencyBillingPage from "./pages/admin/AgencyBillingPage";
import QuoteAcceptancePage from "./pages/QuoteAcceptancePage";
import InvoicePublicPage from "./pages/InvoicePublicPage";
import CustomerDetailPage from "./pages/CustomerDetailPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import BlogPostDetailPage from "./pages/BlogPostDetailPage";
import type { AdminSection } from "./components/admin/AdminLayout";
import { API_BASE_URL } from "./config";

const ADMIN_SECTIONS: AdminSection[] = [
  "dashboard",
  "site",
  "offers",
  "establishment",
  "modules",
  "products",
  "orders",
  "customers",
  "rdv",
  "newsletter",
  "avis-google",
  "stripe",
  "blog",
  "messages",
];

const BlogPostPage = lazy(() => import("@modules/blog/frontend/BlogPostPage"));

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

  // /admin/dashboard/facturation — devis/factures de l'agence elle-même, voir docs/13-facturation-devis.md
  if (segments[0] === "admin" && segments[1] === "dashboard" && segments[2] === "facturation") {
    return <AgencyBillingPage />;
  }

  // /admin/dashboard — vue globale d'Ethan sur tous les tenants
  if (segments[0] === "admin" && segments[1] === "dashboard") {
    return <AgencyDashboardPage />;
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

  // /t/{clientSiteId} — site public d'un tenant
  if (segments[0] === "t" && segments[1]) {
    return <PublicSite clientSiteId={segments[1]} />;
  }

  // Pas de tenant dans l'URL (ex: "/") : rien à afficher côté site, direction la vue globale d'Ethan.
  return <Redirect to="/admin/dashboard" />;
}

export default App;
