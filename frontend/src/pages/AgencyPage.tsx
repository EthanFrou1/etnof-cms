import { useAdminSession } from "../hooks/useAdminSession";
import AdminLoginForm from "../components/AdminLoginForm";
import AgencyLayout, { type AgencySection } from "../components/admin/AgencyLayout";
import OverviewSection from "./agency/OverviewSection";
import PricingSection from "./agency/PricingSection";
import SitesSection from "./agency/SitesSection";
import CompanySection from "./agency/CompanySection";
import BillingClientsSection from "./agency/BillingClientsSection";
import PackageOffersSection from "./agency/PackageOffersSection";
import QuotesSection from "./agency/QuotesSection";
import InvoicesSection from "./agency/InvoicesSection";
import PaymentSection from "./agency/PaymentSection";

function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient text-sm font-black text-white shadow-soft">
        ENW
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-lg font-extrabold text-navy">etnof-web</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-green-accent">
          Agence
        </span>
      </div>
    </div>
  );
}

type AgencyPageProps = {
  section: AgencySection;
};

export default function AgencyPage({ section }: AgencyPageProps) {
  const { password, login } = useAdminSession("agency");

  if (!password) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-10">
        <BrandMark />
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-green-accent">
            Espace réservé
          </span>
          <h1 className="text-3xl font-extrabold text-navy">Espace agence</h1>
          <p className="max-w-sm text-sm text-gray-text">
            Sites clients, tarifs des modules et facturation — réservé à l'agence.
          </p>
        </div>
        <AdminLoginForm loginPath="/api/admin/login" onLoggedIn={login} />
      </div>
    );
  }

  return (
    <AgencyLayout activeSection={section}>
      {section === "dashboard" && <OverviewSection password={password} />}
      {section === "tarifs" && <PricingSection password={password} />}
      {section === "sites" && <SitesSection password={password} />}
      {section === "entreprise" && <CompanySection password={password} />}
      {section === "clients" && <BillingClientsSection password={password} />}
      {section === "formules" && <PackageOffersSection password={password} />}
      {section === "devis" && <QuotesSection password={password} />}
      {section === "factures" && <InvoicesSection password={password} />}
      {section === "paiement" && <PaymentSection password={password} />}
    </AgencyLayout>
  );
}
