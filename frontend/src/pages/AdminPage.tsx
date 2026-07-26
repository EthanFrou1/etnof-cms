import { useAdminSession } from "../hooks/useAdminSession";
import { useModules } from "../hooks/useModules";
import AdminLoginScreen from "../components/admin/AdminLoginScreen";
import AdminLayout, { CATALOGUE_SECTIONS, type AdminSection } from "../components/admin/AdminLayout";
import DashboardSection from "./admin/DashboardSection";
import ContentSection from "./admin/ContentSection";
import EstablishmentSection from "./admin/EstablishmentSection";
import ModulesSection from "./admin/ModulesSection";
import AppearanceSection from "./admin/AppearanceSection";
import MessagesSection from "./admin/MessagesSection";
import ProductsSection from "./admin/ProductsSection";
import OrdersSection from "./admin/OrdersSection";
import CustomersSection from "./admin/CustomersSection";

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

  // Accès direct par URL à une section Catalogue (Produits/Commandes/Clients) alors que le module
  // n'est pas actif pour ce tenant — le lien de nav est déjà masqué (AdminLayout), on bloque aussi
  // le rendu de la section elle-même. `modules !== null` évite un flash avant le premier chargement.
  const blocked = CATALOGUE_SECTIONS.includes(section) && modules !== null && !modules?.catalogue?.enabled;

  return (
    <AdminLayout clientSiteId={clientSiteId} activeSection={section}>
      {blocked ? (
        <div className="rounded-card bg-white p-8 shadow-card">
          <p className="text-gray-text">Le module Catalogue n'est pas activé pour ce site — cette page n'est pas disponible.</p>
        </div>
      ) : (
        <>
          {section === "dashboard" && <DashboardSection clientSiteId={clientSiteId} password={password} />}
          {section === "content" && <ContentSection clientSiteId={clientSiteId} password={password} />}
          {section === "establishment" && <EstablishmentSection clientSiteId={clientSiteId} password={password} />}
          {section === "modules" && <ModulesSection clientSiteId={clientSiteId} password={password} />}
          {section === "appearance" && <AppearanceSection clientSiteId={clientSiteId} password={password} />}
          {section === "products" && <ProductsSection clientSiteId={clientSiteId} password={password} />}
          {section === "orders" && <OrdersSection clientSiteId={clientSiteId} password={password} />}
          {section === "customers" && <CustomersSection clientSiteId={clientSiteId} password={password} />}
          {section === "messages" && <MessagesSection clientSiteId={clientSiteId} password={password} />}
        </>
      )}
    </AdminLayout>
  );
}
