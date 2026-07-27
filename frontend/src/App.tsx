import { lazy, Suspense, useEffect } from "react";
import PublicSite from "./pages/PublicSite";
import AdminPage from "./pages/AdminPage";
import AgencyDashboardPage from "./pages/AgencyDashboardPage";
import CustomerDetailPage from "./pages/CustomerDetailPage";
import ProductDetailPage from "./pages/ProductDetailPage";
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
