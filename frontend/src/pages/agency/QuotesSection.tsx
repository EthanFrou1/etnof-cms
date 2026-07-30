import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import { adminFetch } from "../../hooks/useAdminSession";
import {
  inputClass,
  emptyQuoteLine,
  formatPrice,
  TariffPicker,
  INVOICE_TYPE_OPTIONS,
  type QuoteLine,
  type BillingClient,
} from "./shared";

type QuoteListItem = {
  id: string;
  number: string;
  status: string;
  issueDate: string;
  validUntil: string;
  totalHt: number;
  billingClientId: string;
  clientName: string;
};

type QuoteDetail = {
  id: string;
  number: string;
  billingClientId: string;
  status: string;
  lines: QuoteLine[];
  notes: string;
};

const QUOTE_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  refused: "Refusé",
  expired: "Expiré",
};

const QUOTE_STATUS_STYLES: Record<string, string> = {
  draft: "bg-border-subtle/40 text-gray-text",
  sent: "bg-brand-mid/10 text-brand-mid",
  accepted: "bg-green-accent/10 text-green-accent",
  refused: "bg-red-100 text-red-600",
  expired: "bg-amber-100 text-amber-700",
};

const emptyQuoteForm = { billingClientId: "", lines: [{ ...emptyQuoteLine }], notes: "" };

function CreateInvoiceFromQuote({
  quoteId,
  password,
  onCreated,
}: {
  quoteId: string;
  password: string;
  onCreated: () => void;
}) {
  const [invoiceType, setInvoiceType] = useState("acompte");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    await adminFetch(API_BASE_URL, `/api/admin/quotes/${quoteId}/create-invoice`, password, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceType }),
    });
    setCreating(false);
    setCreated(true);
    onCreated();
  };

  if (created) {
    return <p className="text-sm text-green-accent">Brouillon de facture créé — à finaliser dans l'onglet Factures.</p>;
  }

  return (
    <div className="flex items-center gap-2">
      <select className={`${inputClass} py-1.5 text-sm`} value={invoiceType} onChange={(e) => setInvoiceType(e.target.value)}>
        {INVOICE_TYPE_OPTIONS.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleCreate}
        disabled={creating}
        className="rounded-button border border-border-subtle px-3 py-1.5 text-sm font-medium text-gray-text hover:bg-bg-page-start disabled:opacity-40"
      >
        {creating ? "Création…" : "Créer une facture"}
      </button>
    </div>
  );
}

// Modal unique pour créer ou modifier un devis — le bouton de soumission ne devient cliquable
// qu'une fois un client choisi (seule info nécessaire à la création).
function QuoteFormModal({
  password,
  clients,
  editing,
  onClose,
  onSaved,
}: {
  password: string;
  clients: BillingClient[];
  editing: QuoteDetail | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(
    editing ? { billingClientId: editing.billingClientId, lines: editing.lines, notes: editing.notes } : emptyQuoteForm
  );
  const [saving, setSaving] = useState(false);

  const missingRequired = !form.billingClientId;

  const updateLine = (index: number, patch: Partial<QuoteLine>) => {
    setForm((f) => ({ ...f, lines: f.lines.map((l, i) => (i === index ? { ...l, ...patch } : l)) }));
  };
  const addLine = () => setForm((f) => ({ ...f, lines: [...f.lines, { ...emptyQuoteLine }] }));
  const pickLine = (line: QuoteLine) => setForm((f) => ({ ...f, lines: [...f.lines, line] }));
  const removeLine = (index: number) => setForm((f) => ({ ...f, lines: f.lines.filter((_, i) => i !== index) }));

  const total = form.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const path = editing ? `/api/admin/quotes/${editing.id}` : "/api/admin/quotes";
    await adminFetch(API_BASE_URL, path, password, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-card bg-white p-8 shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy">{editing ? "Modifier le devis" : "Créer un devis"}</h2>
          <button type="button" onClick={onClose} className="text-xl leading-none text-gray-text hover:text-navy">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <select
            className={inputClass}
            value={form.billingClientId}
            onChange={(e) => setForm({ ...form, billingClientId: e.target.value })}
            required
          >
            <option value="" disabled>
              — Choisir un client —
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="flex flex-col gap-2">
            {form.lines.map((line, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className={`${inputClass} flex-1`}
                  placeholder="Désignation"
                  value={line.label}
                  onChange={(e) => updateLine(i, { label: e.target.value })}
                  required
                />
                <input
                  className={`${inputClass} w-16`}
                  type="number"
                  min="0"
                  step="0.5"
                  value={line.quantity}
                  onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })}
                />
                <input
                  className={`${inputClass} w-24`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.unitPrice}
                  onChange={(e) => updateLine(i, { unitPrice: Number(e.target.value) })}
                />
                {form.lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    className="shrink-0 text-lg leading-none text-gray-text hover:text-red-500"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={addLine} className="text-sm font-medium text-brand-mid hover:text-brand-start">
                + Ajouter une ligne
              </button>
              <TariffPicker password={password} onPick={pickLine} />
            </div>
          </div>

          <div className="text-right text-sm font-semibold text-navy">Total HT : {formatPrice(total)}</div>

          <textarea
            className={inputClass}
            placeholder="Notes (visibles par le client)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={missingRequired || saving}
              className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Enregistrement…" : editing ? "Enregistrer" : "Créer le devis"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-button border border-border-subtle px-4 py-2.5 font-semibold text-gray-text hover:bg-bg-page-start"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function QuotesSection({ password }: { password: string }) {
  const [quotes, setQuotes] = useState<QuoteListItem[] | null>(null);
  const [clients, setClients] = useState<BillingClient[]>([]);
  const [modal, setModal] = useState<"create" | QuoteDetail | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const load = () =>
    adminFetch(API_BASE_URL, "/api/admin/quotes", password)
      .then((res) => res.json())
      .then(setQuotes);

  useEffect(() => {
    load();
    adminFetch(API_BASE_URL, "/api/admin/billing-clients", password)
      .then((res) => res.json())
      .then(setClients);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openEdit = async (id: string) => {
    const res = await adminFetch(API_BASE_URL, `/api/admin/quotes/${id}`, password);
    const detail: QuoteDetail = await res.json();
    setModal(detail);
  };

  const handleSend = async (id: string) => {
    await adminFetch(API_BASE_URL, `/api/admin/quotes/${id}/send`, password, { method: "POST" });
    load();
  };

  const handleDelete = async (id: string) => {
    await adminFetch(API_BASE_URL, `/api/admin/quotes/${id}`, password, { method: "DELETE" });
    load();
  };

  const handleDownloadPdf = async (quote: QuoteListItem) => {
    setDownloadingId(quote.id);
    const res = await adminFetch(API_BASE_URL, `/api/admin/quotes/${quote.id}/pdf`, password);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `devis-${quote.number}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
    setDownloadingId(null);
  };

  const publicUrl = (id: string) => `${window.location.origin}/devis/${id}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">Devis</h1>
          <p className="text-sm text-gray-text">
            Un devis brouillon peut être modifié ou supprimé ; une fois envoyé, le client l'accepte via un lien public.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal("create")}
          className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white hover:opacity-90"
        >
          + Créer un devis
        </button>
      </div>

      <section className="rounded-card bg-white p-6 shadow-card">
        {!quotes ? (
          <p className="text-gray-text">Chargement…</p>
        ) : quotes.length === 0 ? (
          <p className="text-sm text-gray-text">Aucun devis pour l'instant.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {quotes.map((quote) => (
              <li key={quote.id} className="flex flex-col gap-1 rounded-button bg-bg-page-start/60 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-navy">
                    {quote.number} — {quote.clientName}
                  </span>
                  <span
                    className={`shrink-0 rounded-pill px-2.5 py-1 text-xs font-semibold ${
                      QUOTE_STATUS_STYLES[quote.status] ?? "bg-border-subtle/40 text-gray-text"
                    }`}
                  >
                    {QUOTE_STATUS_LABELS[quote.status] ?? quote.status}
                  </span>
                </div>
                <div className="text-sm text-gray-text">
                  {formatPrice(quote.totalHt)} · valable jusqu'au{" "}
                  {new Date(quote.validUntil).toLocaleDateString("fr-FR")}
                </div>
                {quote.status !== "draft" && (
                  <a
                    href={publicUrl(quote.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-brand-mid hover:underline"
                  >
                    Lien public ↗
                  </a>
                )}
                <div className="mt-1 flex flex-wrap gap-3 text-sm">
                  {quote.status === "draft" && (
                    <>
                      <button
                        type="button"
                        onClick={() => openEdit(quote.id)}
                        className="font-medium text-brand-mid hover:text-brand-start"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSend(quote.id)}
                        className="font-medium text-brand-mid hover:text-brand-start"
                      >
                        Envoyer
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(quote.id)}
                        className="font-medium text-red-500 hover:text-red-600"
                      >
                        Supprimer
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDownloadPdf(quote)}
                    disabled={downloadingId === quote.id}
                    className="font-medium text-gray-text hover:text-navy disabled:opacity-40"
                  >
                    {downloadingId === quote.id ? "Téléchargement…" : "Télécharger PDF"}
                  </button>
                </div>
                {quote.status === "accepted" && (
                  <div className="mt-2">
                    <CreateInvoiceFromQuote quoteId={quote.id} password={password} onCreated={load} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {modal && (
        <QuoteFormModal
          password={password}
          clients={clients}
          editing={modal === "create" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
