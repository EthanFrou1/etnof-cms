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

type InvoiceListItem = {
  id: string;
  number: string | null;
  invoiceType: string;
  status: string;
  issueDate: string;
  dueDate: string;
  totalHt: number;
  isFinalized: boolean;
  billingClientId: string;
  clientName: string;
};

type InvoiceDetail = {
  id: string;
  billingClientId: string;
  quoteId: string | null;
  invoiceType: string;
  lines: QuoteLine[];
  notes: string;
};

const INVOICE_TYPE_LABELS: Record<string, string> = {
  acompte: "Acompte",
  solde: "Solde",
  unique: "Facture unique",
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  paid: "Payée",
  overdue: "En retard",
  cancelled: "Annulée",
};

const INVOICE_STATUS_STYLES: Record<string, string> = {
  draft: "bg-border-subtle/40 text-gray-text",
  sent: "bg-brand-mid/10 text-brand-mid",
  paid: "bg-green-accent/10 text-green-accent",
  overdue: "bg-red-100 text-red-600",
  cancelled: "bg-border-subtle/40 text-gray-text line-through",
};

const emptyInvoiceForm = { billingClientId: "", quoteId: null as string | null, invoiceType: "unique", lines: [{ ...emptyQuoteLine }], notes: "" };

// Modal unique pour créer ou modifier une facture — le bouton de soumission ne devient cliquable
// qu'une fois un client choisi (seule info nécessaire à la création).
function InvoiceFormModal({
  password,
  clients,
  editing,
  onClose,
  onSaved,
}: {
  password: string;
  clients: BillingClient[];
  editing: InvoiceDetail | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(
    editing
      ? {
          billingClientId: editing.billingClientId,
          quoteId: editing.quoteId,
          invoiceType: editing.invoiceType,
          lines: editing.lines,
          notes: editing.notes,
        }
      : emptyInvoiceForm
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
    const path = editing ? `/api/admin/invoices/${editing.id}` : "/api/admin/invoices";
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
          <h2 className="text-lg font-bold text-navy">{editing ? "Modifier la facture" : "Créer une facture"}</h2>
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

          <select
            className={inputClass}
            value={form.invoiceType}
            onChange={(e) => setForm({ ...form, invoiceType: e.target.value })}
          >
            {INVOICE_TYPE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
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
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={missingRequired || saving}
              className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Enregistrement…" : editing ? "Enregistrer" : "Créer la facture (brouillon)"}
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

export default function InvoicesSection({ password }: { password: string }) {
  const [invoices, setInvoices] = useState<InvoiceListItem[] | null>(null);
  const [clients, setClients] = useState<BillingClient[]>([]);
  const [modal, setModal] = useState<"create" | InvoiceDetail | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const load = () =>
    adminFetch(API_BASE_URL, "/api/admin/invoices", password)
      .then((res) => res.json())
      .then(setInvoices);

  useEffect(() => {
    load();
    adminFetch(API_BASE_URL, "/api/admin/billing-clients", password)
      .then((res) => res.json())
      .then(setClients);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openEdit = async (id: string) => {
    const res = await adminFetch(API_BASE_URL, `/api/admin/invoices/${id}`, password);
    const detail: InvoiceDetail = await res.json();
    setModal(detail);
  };

  const handleFinalize = async (id: string) => {
    if (!window.confirm("Finaliser cette facture ? Elle recevra un numéro définitif et ne pourra plus être modifiée.")) return;
    await adminFetch(API_BASE_URL, `/api/admin/invoices/${id}/finalize`, password, { method: "POST" });
    load();
  };

  const handleMarkPaid = async (id: string) => {
    await adminFetch(API_BASE_URL, `/api/admin/invoices/${id}/mark-paid`, password, { method: "POST" });
    load();
  };

  const handleCancel = async (id: string) => {
    await adminFetch(API_BASE_URL, `/api/admin/invoices/${id}/cancel`, password, { method: "POST" });
    load();
  };

  const handleDelete = async (id: string) => {
    await adminFetch(API_BASE_URL, `/api/admin/invoices/${id}`, password, { method: "DELETE" });
    load();
  };

  const handleDownloadPdf = async (invoice: InvoiceListItem) => {
    setDownloadingId(invoice.id);
    const res = await adminFetch(API_BASE_URL, `/api/admin/invoices/${invoice.id}/pdf`, password);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `facture-${invoice.number ?? "brouillon"}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
    setDownloadingId(null);
  };

  const isOverdue = (invoice: InvoiceListItem) => invoice.status === "sent" && new Date(invoice.dueDate) < new Date();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">Factures</h1>
          <p className="text-sm text-gray-text">
            Le numéro n'est attribué qu'à la finalisation (séquence légale sans trou) — une facture finalisée ne peut
            plus être modifiée ni supprimée, seulement annulée.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal("create")}
          className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white hover:opacity-90"
        >
          + Créer une facture
        </button>
      </div>

      <section className="rounded-card bg-white p-6 shadow-card">
        {!invoices ? (
          <p className="text-gray-text">Chargement…</p>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-gray-text">Aucune facture pour l'instant.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {invoices.map((invoice) => {
              const effectiveStatus = isOverdue(invoice) ? "overdue" : invoice.status;
              return (
                <li key={invoice.id} className="flex flex-col gap-1 rounded-button bg-bg-page-start/60 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-navy">
                      {invoice.number ?? "Brouillon"} — {invoice.clientName}
                    </span>
                    <span
                      className={`shrink-0 rounded-pill px-2.5 py-1 text-xs font-semibold ${
                        INVOICE_STATUS_STYLES[effectiveStatus] ?? "bg-border-subtle/40 text-gray-text"
                      }`}
                    >
                      {INVOICE_STATUS_LABELS[effectiveStatus] ?? effectiveStatus}
                    </span>
                  </div>
                  <div className="text-sm text-gray-text">
                    {INVOICE_TYPE_LABELS[invoice.invoiceType] ?? invoice.invoiceType} · {formatPrice(invoice.totalHt)} ·
                    échéance {new Date(invoice.dueDate).toLocaleDateString("fr-FR")}
                  </div>
                  {invoice.isFinalized && (
                    <a
                      href={`${window.location.origin}/facture/${invoice.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-brand-mid hover:underline"
                    >
                      Lien public ↗
                    </a>
                  )}
                  <div className="mt-1 flex flex-wrap gap-3 text-sm">
                    {!invoice.isFinalized && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEdit(invoice.id)}
                          className="font-medium text-brand-mid hover:text-brand-start"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFinalize(invoice.id)}
                          className="font-medium text-brand-mid hover:text-brand-start"
                        >
                          Finaliser
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(invoice.id)}
                          className="font-medium text-red-500 hover:text-red-600"
                        >
                          Supprimer
                        </button>
                      </>
                    )}
                    {invoice.isFinalized && invoice.status !== "paid" && invoice.status !== "cancelled" && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleMarkPaid(invoice.id)}
                          className="font-medium text-green-accent hover:opacity-80"
                        >
                          Marquer payée
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancel(invoice.id)}
                          className="font-medium text-red-500 hover:text-red-600"
                        >
                          Annuler
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(invoice)}
                      disabled={downloadingId === invoice.id}
                      className="font-medium text-gray-text hover:text-navy disabled:opacity-40"
                    >
                      {downloadingId === invoice.id ? "Téléchargement…" : "Télécharger PDF"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {modal && (
        <InvoiceFormModal
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
