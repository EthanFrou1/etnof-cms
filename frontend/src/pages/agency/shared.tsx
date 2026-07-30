import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import { adminFetch } from "../../hooks/useAdminSession";

// Styles et types partagés entre les sections agence (facturation) — un seul endroit pour
// éviter de dupliquer TariffPicker/QuoteLine entre Devis et Factures.
export const inputClass =
  "rounded-button border border-border-subtle bg-white px-3 py-2 text-navy placeholder:text-gray-text/60 focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20";

export const stripeInputClass =
  "rounded-button border border-border-subtle bg-white px-3 py-2 font-mono text-sm text-navy placeholder:font-sans placeholder:text-gray-text/60 focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20";

export type QuoteLine = { label: string; quantity: number; unitPrice: number };

export type PackageOffer = {
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted: boolean;
};

export type ModuleMeta = { name: string; displayName: string; price: string };

export type BillingClient = {
  id: string;
  clientSiteId: string | null;
  name: string;
  isCompany: boolean;
  siret: string;
  address: string;
  email: string;
  phone: string;
  notes: string;
  createdAt: string;
};

export type ClientSiteOption = { id: string; name: string };

export const emptyQuoteLine: QuoteLine = { label: "", quantity: 1, unitPrice: 0 };

export const formatPrice = (value: number) => `${value.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`;

// "690€", "Offert", "" -> 0 — même principe que onlyDigits() côté PricingSection.tsx pour les
// prix de modules (texte libre, seuls les chiffres comptent).
export const parsePriceToNumber = (priceText: string): number => {
  const digits = priceText.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
};

export const INVOICE_TYPE_OPTIONS: { id: string; label: string }[] = [
  { id: "acompte", label: "Acompte" },
  { id: "solde", label: "Solde" },
  { id: "unique", label: "Facture unique" },
];

// Sélecteur partagé Devis/Factures : pioche une ligne préremplie depuis les formules de base
// (PackageOffer) ou les modules à la carte déjà tarifés (ModulePrice, via /api/admin/modules).
export function TariffPicker({ password, onPick }: { password: string; onPick: (line: QuoteLine) => void }) {
  const [offers, setOffers] = useState<PackageOffer[]>([]);
  const [modules, setModules] = useState<ModuleMeta[]>([]);

  useEffect(() => {
    adminFetch(API_BASE_URL, "/api/admin/package-offers", password)
      .then((res) => res.json())
      .then(setOffers);
    adminFetch(API_BASE_URL, "/api/admin/modules", password)
      .then((res) => res.json())
      .then((data: ModuleMeta[]) => setModules(data.filter((m) => m.price)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [kind, id] = e.target.value.split(":");
    if (kind === "offer") {
      const offer = offers.find((o) => o.id === id);
      if (offer) onPick({ label: offer.name, quantity: 1, unitPrice: parsePriceToNumber(offer.price) });
    } else if (kind === "module") {
      const mod = modules.find((m) => m.name === id);
      if (mod) onPick({ label: mod.displayName, quantity: 1, unitPrice: parsePriceToNumber(mod.price) });
    }
    e.target.value = "";
  };

  if (offers.length === 0 && modules.length === 0) return null;

  return (
    <select className={`${inputClass} text-sm`} defaultValue="" onChange={handleChange}>
      <option value="" disabled>
        + Ajouter depuis mes tarifs
      </option>
      {offers.length > 0 && (
        <optgroup label="Formules">
          {offers.map((o) => (
            <option key={o.id} value={`offer:${o.id}`}>
              {o.name} — {o.price}
            </option>
          ))}
        </optgroup>
      )}
      {modules.length > 0 && (
        <optgroup label="Modules">
          {modules.map((m) => (
            <option key={m.name} value={`module:${m.name}`}>
              {m.displayName} — {m.price}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}
