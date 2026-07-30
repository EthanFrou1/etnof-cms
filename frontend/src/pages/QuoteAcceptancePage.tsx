import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";

// Page publique, sans authentification (lien envoyé par email au client) — voir
// docs/13-facturation-devis.md, "signature électronique simple". Route : /devis/{id}.
type PublicQuote = {
  id: string;
  number: string;
  status: string;
  issueDate: string;
  validUntil: string;
  lines: { label: string; quantity: number; unitPrice: number }[];
  totalHt: number;
  notes: string;
  acceptedAt: string | null;
  clientName: string;
  companyTradeName: string;
  cgvUrl: string;
};

const inputClass =
  "rounded-button border border-border-subtle bg-white px-3 py-2 text-navy placeholder:text-gray-text/60 focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20";

const formatPrice = (value: number) => `${value.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`;

export default function QuoteAcceptancePage({ quoteId }: { quoteId: string }) {
  const [quote, setQuote] = useState<PublicQuote | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  const load = () =>
    fetch(`${API_BASE_URL}/api/public/quotes/${quoteId}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then(setQuote)
      .catch(() => setNotFound(true));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("saving");
    const res = await fetch(`${API_BASE_URL}/api/public/quotes/${quoteId}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });
    if (res.ok) {
      await load();
    } else {
      setStatus("error");
    }
  };

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-gray-text">Ce devis n'est pas (ou plus) disponible.</p>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-gray-text">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <header className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-green-accent">
            {quote.companyTradeName}
          </span>
          <h1 className="text-2xl font-extrabold text-navy">Devis {quote.number}</h1>
          <p className="text-sm text-gray-text">
            Émis le {new Date(quote.issueDate).toLocaleDateString("fr-FR")} · Valable jusqu'au{" "}
            {new Date(quote.validUntil).toLocaleDateString("fr-FR")}
          </p>
        </header>

        <section className="rounded-card bg-white p-6 shadow-card">
          <p className="mb-4 text-sm text-gray-text">Destinataire : {quote.clientName}</p>
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
              {quote.lines.map((line, i) => (
                <tr key={i} className="border-b border-border-subtle last:border-0">
                  <td className="py-2">{line.label}</td>
                  <td className="py-2 text-right">{line.quantity}</td>
                  <td className="py-2 text-right">{formatPrice(line.unitPrice)}</td>
                  <td className="py-2 text-right">{formatPrice(line.quantity * line.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 text-right text-lg font-bold text-navy">Total HT : {formatPrice(quote.totalHt)}</div>
          {quote.notes && <p className="mt-4 whitespace-pre-wrap text-sm text-gray-text">{quote.notes}</p>}
          {quote.cgvUrl && (
            <p className="mt-4 text-xs text-gray-text">
              Ce devis est soumis aux{" "}
              <a href={quote.cgvUrl} target="_blank" rel="noreferrer" className="text-brand-mid hover:underline">
                conditions générales de vente
              </a>
              .
            </p>
          )}
        </section>

        {quote.status === "accepted" ? (
          <section className="rounded-card bg-green-accent/10 p-6 text-center shadow-card">
            <p className="font-semibold text-navy">
              Devis accepté{quote.acceptedAt ? ` le ${new Date(quote.acceptedAt).toLocaleDateString("fr-FR")}` : ""}.
            </p>
            <p className="mt-1 text-sm text-gray-text">Merci, tu recevras la suite par email.</p>
          </section>
        ) : (
          <section className="rounded-card bg-white p-6 shadow-card">
            <h2 className="mb-4 text-lg font-bold text-navy">Accepter ce devis</h2>
            <form onSubmit={handleAccept} className="flex flex-col gap-3">
              <input
                className={inputClass}
                placeholder="Nom"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <input
                className={inputClass}
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <label className="flex items-center gap-2 text-sm text-navy">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="h-4 w-4 accent-brand-mid"
                  required
                />
                J'accepte ce devis et ses conditions.
              </label>
              {status === "error" && <p className="text-sm text-red-500">Impossible d'accepter ce devis pour le moment.</p>}
              <button
                type="submit"
                disabled={!agreed || status === "saving"}
                className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {status === "saving" ? "Envoi…" : "Accepter le devis"}
              </button>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}
