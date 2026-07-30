import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../config";

// Page publique, sans authentification — le client paie sa facture en ligne (compte Stripe de
// l'agence, voir backend/InvoicePaymentEndpoints.cs). Route : /facture/{id}.
type PublicInvoice = {
  id: string;
  number: string;
  invoiceType: string;
  status: string;
  issueDate: string;
  dueDate: string;
  lines: { label: string; quantity: number; unitPrice: number }[];
  totalHt: number;
  notes: string;
  paidAt: string | null;
  clientName: string;
  companyTradeName: string;
};

const INVOICE_TYPE_LABELS: Record<string, string> = {
  acompte: "Facture d'acompte",
  solde: "Facture de solde",
  unique: "Facture",
};

const formatPrice = (value: number) => `${value.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`;

export default function InvoicePublicPage({ invoiceId }: { invoiceId: string }) {
  const [invoice, setInvoice] = useState<PublicInvoice | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const confirming = useRef(false);

  const load = () =>
    fetch(`${API_BASE_URL}/api/public/invoices/${invoiceId}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data: PublicInvoice) => {
        setInvoice(data);
        return data;
      })
      .catch(() => {
        setNotFound(true);
        return null;
      });

  useEffect(() => {
    load().then((data) => {
      // Retour depuis Stripe : le webhook peut arriver quelques secondes après la redirection —
      // on réinterroge l'API à quelques reprises le temps qu'il confirme, plutôt que de dépendre
      // uniquement de la redirection navigateur (jamais source de vérité pour le paiement).
      const params = new URLSearchParams(window.location.search);
      if (params.get("checkout") === "success" && data && data.status !== "paid" && !confirming.current) {
        confirming.current = true;
        let attempts = 0;
        const interval = setInterval(async () => {
          attempts += 1;
          const updated = await load();
          if ((updated && updated.status === "paid") || attempts >= 6) clearInterval(interval);
        }, 2000);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePay = async () => {
    setPaying(true);
    setPayError(null);
    const res = await fetch(`${API_BASE_URL}/api/public/invoices/${invoiceId}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnBaseUrl: window.location.origin }),
    });
    const data = await res.json();
    if (res.ok) {
      window.location.href = data.url;
    } else {
      setPayError(data.error ?? "Impossible de démarrer le paiement.");
      setPaying(false);
    }
  };

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-gray-text">Cette facture n'est pas (ou plus) disponible.</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-gray-text">Chargement…</p>
      </div>
    );
  }

  const checkoutParam = new URLSearchParams(window.location.search).get("checkout");

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <header className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-green-accent">
            {invoice.companyTradeName}
          </span>
          <h1 className="text-2xl font-extrabold text-navy">
            {INVOICE_TYPE_LABELS[invoice.invoiceType] ?? "Facture"} {invoice.number}
          </h1>
          <p className="text-sm text-gray-text">
            Émise le {new Date(invoice.issueDate).toLocaleDateString("fr-FR")} · Échéance le{" "}
            {new Date(invoice.dueDate).toLocaleDateString("fr-FR")}
          </p>
        </header>

        <section className="rounded-card bg-white p-6 shadow-card">
          <p className="mb-4 text-sm text-gray-text">Destinataire : {invoice.clientName}</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs font-semibold uppercase tracking-[0.05em] text-gray-text">
                <th className="py-2">Désignation</th>
                <th className="py-2 text-right">Qté</th>
                <th className="py-2 text-right">Prix unitaire</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((line, i) => (
                <tr key={i} className="border-b border-border-subtle last:border-0">
                  <td className="py-2">{line.label}</td>
                  <td className="py-2 text-right">{line.quantity}</td>
                  <td className="py-2 text-right">{formatPrice(line.unitPrice)}</td>
                  <td className="py-2 text-right">{formatPrice(line.quantity * line.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 text-right text-lg font-bold text-navy">Total : {formatPrice(invoice.totalHt)}</div>
          {invoice.notes && <p className="mt-4 whitespace-pre-wrap text-sm text-gray-text">{invoice.notes}</p>}
        </section>

        {invoice.status === "paid" ? (
          <section className="rounded-card bg-green-accent/10 p-6 text-center shadow-card">
            <p className="font-semibold text-navy">
              Facture payée{invoice.paidAt ? ` le ${new Date(invoice.paidAt).toLocaleDateString("fr-FR")}` : ""}.
            </p>
            <p className="mt-1 text-sm text-gray-text">Merci !</p>
          </section>
        ) : (
          <section className="rounded-card bg-white p-6 text-center shadow-card">
            {checkoutParam === "success" ? (
              <p className="text-sm text-gray-text">
                Paiement en cours de confirmation… cette page se mettra à jour automatiquement dans quelques
                secondes.
              </p>
            ) : (
              <>
                {checkoutParam === "cancel" && (
                  <p className="mb-3 text-sm text-gray-text">Paiement annulé — tu peux réessayer quand tu veux.</p>
                )}
                {payError && <p className="mb-3 text-sm text-red-500">{payError}</p>}
                <button
                  type="button"
                  onClick={handlePay}
                  disabled={paying}
                  className="rounded-button bg-brand-gradient px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {paying ? "Redirection…" : `Payer ${formatPrice(invoice.totalHt)} en ligne`}
                </button>
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
