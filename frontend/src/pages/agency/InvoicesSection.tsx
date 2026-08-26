import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../config";
import { StatusLegend } from "../../components/admin/StatusLegend";
import Select from "../../components/admin/Select";
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

const INVOICE_STATUS_LEGEND = [
  { label: INVOICE_STATUS_LABELS.draft, badgeClass: INVOICE_STATUS_STYLES.draft, description: "Pas encore de numéro — modifiable ou supprimable librement." },
  { label: INVOICE_STATUS_LABELS.sent, badgeClass: INVOICE_STATUS_STYLES.sent, description: "Finalisée (numéro définitif attribué), en attente de paiement." },
  { label: INVOICE_STATUS_LABELS.paid, badgeClass: INVOICE_STATUS_STYLES.paid, description: "Réglée, en ligne (Stripe) ou marquée payée manuellement." },
  { label: INVOICE_STATUS_LABELS.overdue, badgeClass: INVOICE_STATUS_STYLES.overdue, description: "Envoyée et échéance dépassée sans paiement. Un rappel automatique part au client 7 jours après l'échéance." },
  { label: INVOICE_STATUS_LABELS.cancelled, badgeClass: INVOICE_STATUS_STYLES.cancelled, description: "Ne sera jamais payée — le numéro reste réservé (séquence légale sans trou)." },
];

// "overdue" n'existe pas côté base (voir Invoice.cs) — dérivé côté client (isOverdue) à partir
// d'une facture "sent" dont l'échéance est dépassée, mais traité comme un statut à part entière
// pour l'affichage et le filtre, au même titre que les statuts réels.
const INVOICE_STATUS_FILTERS: { value: "all" | keyof typeof INVOICE_STATUS_LABELS; label: string }[] = [
  { value: "all", label: "Tous les statuts" },
  { value: "draft", label: "Brouillon" },
  { value: "sent", label: "Envoyée" },
  { value: "paid", label: "Payée" },
  { value: "overdue", label: "En retard" },
  { value: "cancelled", label: "Annulée" },
];

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
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
            Client
            <Select
              className={inputClass}
              value={form.billingClientId}
              onChange={(billingClientId) => setForm({ ...form, billingClientId })}
              options={[
                { value: "", label: "— Choisir un client —" },
                ...clients.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
            Type de facture
            <Select
              className={inputClass}
              value={form.invoiceType}
              onChange={(invoiceType) => setForm({ ...form, invoiceType })}
              options={INVOICE_TYPE_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
            />
          </label>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.05em] text-gray-text">
              <span className="flex-1">Désignation</span>
              <span className="w-16">Qté</span>
              <span className="w-24">Prix unitaire</span>
            </div>
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

          <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
            Notes
            <textarea
              className={inputClass}
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>

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
  const [statusFilter, setStatusFilter] = useState<(typeof INVOICE_STATUS_FILTERS)[number]["value"]>("all");

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

  const rows = useMemo(
    () =>
      (invoices ?? [])
        .map((invoice) => ({ invoice, effectiveStatus: isOverdue(invoice) ? "overdue" : invoice.status }))
        .filter((r) => statusFilter === "all" || r.effectiveStatus === statusFilter),
    [invoices, statusFilter]
  );

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

      {!invoices ? (
        <p className="text-gray-text">Chargement…</p>
      ) : invoices.length === 0 ? (
        <section className="rounded-card bg-white p-6 shadow-card">
          <p className="text-sm text-gray-text">Aucune facture pour l'instant.</p>
        </section>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-44 shrink-0">
              <Select
                className={inputClass}
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as typeof statusFilter)}
                options={INVOICE_STATUS_FILTERS.map((f) => ({ value: f.value, label: f.label }))}
              />
            </div>
            <StatusLegend items={INVOICE_STATUS_LEGEND} />
            <span className="text-sm text-gray-text">
              {rows.length} facture{rows.length > 1 ? "s" : ""}
            </span>
          </div>

          <p className="text-xs text-gray-text sm:hidden">← Fais glisser le tableau pour voir plus de colonnes →</p>

          <div className="relative overflow-x-auto rounded-card bg-white shadow-card">
            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent sm:hidden" />
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-xs font-semibold uppercase tracking-[0.05em] text-gray-text">
                  <th className="px-4 py-3 text-left">Numéro</th>
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Montant</th>
                  <th className="px-4 py-3 text-left">Échéance</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-gray-text">
                      Aucune facture pour ce statut.
                    </td>
                  </tr>
                ) : (
                  rows.map(({ invoice, effectiveStatus }) => (
                    <tr key={invoice.id} className="border-b border-border-subtle last:border-0 hover:bg-bg-page-start">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-navy">{invoice.number ?? "Brouillon"}</td>
                      <td className="px-4 py-3 text-navy">{invoice.clientName}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-text">
                        {INVOICE_TYPE_LABELS[invoice.invoiceType] ?? invoice.invoiceType}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-navy">{formatPrice(invoice.totalHt)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-text">
                        {new Date(invoice.dueDate).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-pill px-2.5 py-1 text-xs font-semibold ${
                            INVOICE_STATUS_STYLES[effectiveStatus] ?? "bg-border-subtle/40 text-gray-text"
                          }`}
                        >
                          {INVOICE_STATUS_LABELS[effectiveStatus] ?? effectiveStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex flex-wrap gap-3">
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
                          {invoice.isFinalized && (
                            <a
                              href={`${window.location.origin}/facture/${invoice.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-mid hover:underline"
                            >
                              Lien public ↗
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

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
