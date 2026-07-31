import { useAdminSession } from "../hooks/useAdminSession";
import { useModules } from "../hooks/useModules";
import AdminLoginScreen from "../components/admin/AdminLoginScreen";
import AdminLayout, {
  CATALOGUE_SECTIONS,
  RDV_SECTIONS,
  NEWSLETTER_SECTIONS,
  AVIS_GOOGLE_SECTIONS,
  STRIPE_SECTIONS,
  BLOG_SECTIONS,
  MULTILINGUE_SECTIONS,
  type AdminSection,
} from "../components/admin/AdminLayout";
import DashboardSection from "./admin/DashboardSection";
import SiteSection from "./admin/SiteSection";
import OffersSection from "./admin/OffersSection";
import EstablishmentSection from "./admin/EstablishmentSection";
import ModulesSection from "./admin/ModulesSection";
import MessagesSection from "./admin/MessagesSection";
import ProductsSection from "./admin/ProductsSection";
import OrdersSection from "./admin/OrdersSection";
import CustomersSection from "./admin/CustomersSection";
import RdvSection from "./admin/RdvSection";
import NewsletterSection from "./admin/NewsletterSection";
import AvisGoogleSection from "./admin/AvisGoogleSection";
import StripeSection from "./admin/StripeSection";
import BlogSection from "./admin/BlogSection";
import MultilingueSection from "./admin/MultilingueSection";

type AdminPageProps = {
  clientSiteId: string;
  section: AdminSection;
};

export default function AdminPage({ clientSiteId, section }: AdminPageProps) {
  const { password, login } = useAdminSession(clientSiteId);
  const modules = useModules(clientSiteId);

  if (!password) {
    return (
      <AdminLoginScreen
        title="Connecte-toi pour gérer ton site"
        loginPath={`/api/t/${clientSiteId}/admin/login`}
        onLoggedIn={login}
      />
    );
  }

  // Accès direct par URL à une section liée à un module (Catalogue, RDV, Newsletter) alors que ce
  // module n'est pas actif pour ce tenant — le lien de nav est déjà masqué (AdminLayout), on bloque
  // aussi le rendu de la section elle-même. `modules !== null` évite un flash avant le premier chargement.
  const blockedByModule = modules === null ? null
    : CATALOGUE_SECTIONS.includes(section) && !modules?.catalogue?.enabled ? "Catalogue"
    : RDV_SECTIONS.includes(section) && !modules?.rdv?.enabled ? "Rendez-vous"
    : NEWSLETTER_SECTIONS.includes(section) && !modules?.newsletter?.enabled ? "Newsletter"
    : AVIS_GOOGLE_SECTIONS.includes(section) && !modules?.["avis-google"]?.enabled ? "Avis Google"
    : STRIPE_SECTIONS.includes(section) && !modules?.stripe?.enabled ? "Paiement Stripe"
    : BLOG_SECTIONS.includes(section) && !modules?.blog?.enabled ? "Blog"
    : MULTILINGUE_SECTIONS.includes(section) && !modules?.multilingue?.enabled ? "Multilingue"
    : null;

  return (
    <AdminLayout clientSiteId={clientSiteId} activeSection={section} password={password}>
      {blockedByModule ? (
        <div className="rounded-card bg-white p-8 shadow-card">
          <p className="text-gray-text">
            Le module {blockedByModule} n'est pas activé pour ce site — cette page n'est pas disponible.
          </p>
        </div>
      ) : (
        <>
          {section === "dashboard" && <DashboardSection clientSiteId={clientSiteId} password={password} />}
          {section === "site" && <SiteSection clientSiteId={clientSiteId} password={password} />}
          {section === "offers" && <OffersSection clientSiteId={clientSiteId} password={password} />}
          {section === "establishment" && <EstablishmentSection clientSiteId={clientSiteId} password={password} />}
          {section === "modules" && <ModulesSection clientSiteId={clientSiteId} password={password} />}
          {section === "products" && <ProductsSection clientSiteId={clientSiteId} password={password} />}
          {section === "orders" && <OrdersSection clientSiteId={clientSiteId} password={password} />}
          {section === "customers" && <CustomersSection clientSiteId={clientSiteId} password={password} />}
          {section === "rdv" && <RdvSection clientSiteId={clientSiteId} password={password} />}
          {section === "newsletter" && <NewsletterSection clientSiteId={clientSiteId} password={password} />}
          {section === "avis-google" && <AvisGoogleSection clientSiteId={clientSiteId} password={password} />}
          {section === "stripe" && <StripeSection clientSiteId={clientSiteId} password={password} />}
          {section === "blog" && <BlogSection clientSiteId={clientSiteId} password={password} />}
          {section === "multilingue" && <MultilingueSection clientSiteId={clientSiteId} password={password} />}
          {section === "messages" && <MessagesSection clientSiteId={clientSiteId} password={password} />}
        </>
      )}
    </AdminLayout>
  );
}
