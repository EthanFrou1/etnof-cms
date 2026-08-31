import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import { adminFetch } from "../../hooks/useAdminSession";
import ConfirmModal from "../../components/admin/ConfirmModal";

type AccountsSectionProps = {
  clientSiteId: string;
  password: string;
};

type Account = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  activatedAt: string | null;
  createdAt: string;
};

const inputClass =
  "rounded-button border border-border-subtle bg-white px-3 py-2 text-navy placeholder:text-gray-text/60 focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20";

const emptyForm = { firstName: "", lastName: "", email: "", phone: "" };

// Modal unique pour créer ou modifier un compte "Employé" — même patron que SiteFormModal
// (agency/SitesSection.tsx). Pas de champ mot de passe : l'employé le définit lui-même via le lien
// d'invitation envoyé par email (voir TenantAdminEndpoints.cs, SendInviteAsync).
function AccountFormModal({
  clientSiteId,
  password,
  editing,
  onClose,
  onSaved,
}: {
  clientSiteId: string;
  password: string;
  editing: Account | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(
    editing
      ? { firstName: editing.firstName, lastName: editing.lastName, email: editing.email, phone: editing.phone }
      : emptyForm
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missingRequired = !form.firstName.trim() || !form.lastName.trim() || !form.email.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const path = editing
      ? `/api/t/${clientSiteId}/admin/accounts/${editing.id}`
      : `/api/t/${clientSiteId}/admin/accounts`;
    const res = await adminFetch(API_BASE_URL, path, password, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      onSaved();
      onClose();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Erreur lors de l'enregistrement.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-card bg-white p-8 shadow-soft" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy">{editing ? "Modifier le compte" : "Ajouter un compte Employé"}</h2>
          <button type="button" onClick={onClose} className="text-xl leading-none text-gray-text hover:text-navy">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
              Prénom
              <input
                className={inputClass}
                placeholder="Prénom"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
              Nom
              <input
                className={inputClass}
                placeholder="Nom"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
            Email
            <input
              type="email"
              className={inputClass}
              placeholder="employe@exemple.fr"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-text">
            Téléphone
            <input
              type="tel"
              className={inputClass}
              placeholder="06 12 34 56 78"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>

          {!editing && (
            <p className="text-xs text-gray-text">
              Un email d'invitation sera envoyé à cette adresse — la personne définit elle-même son mot de passe en cliquant dessus.
            </p>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              disabled={missingRequired || saving}
              className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Enregistrement…" : editing ? "Enregistrer" : "Envoyer l'invitation"}
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

// Comptes "Employé" — accès restreint (pas de Modules, Paiement Stripe, ni cette page elle-même),
// voir TenantAdminAuth.IsOwnerAuthorizedAsync. Cette page est elle-même réservée au Propriétaire
// (bloquée dans AdminLayout/AdminPage pour un compte Employé, jamais atteinte).
export default function AccountsSection({ clientSiteId, password }: AccountsSectionProps) {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [modal, setModal] = useState<"create" | Account | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resentId, setResentId] = useState<string | null>(null);

  const load = () =>
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/accounts`, password)
      .then((res) => res.json())
      .then(setAccounts);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: string) => {
    await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/accounts/${id}`, password, { method: "DELETE" });
    setAccountToDelete(null);
    load();
  };

  const handleResend = async (id: string) => {
    setResendingId(id);
    await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/accounts/${id}/resend-invite`, password, { method: "POST" });
    setResendingId(null);
    setResentId(id);
    setTimeout(() => setResentId((current) => (current === id ? null : current)), 3000);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">Comptes</h1>
          <p className="text-sm text-gray-text">
            Donne à un employé un accès quotidien (commandes, produits, blog…) sans lui donner accès
            aux modules, au paiement Stripe ni à la gestion des comptes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal("create")}
          className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white hover:opacity-90"
        >
          + Ajouter un compte
        </button>
      </div>

      {!accounts ? (
        <p className="text-gray-text">Chargement…</p>
      ) : accounts.length === 0 ? (
        <section className="rounded-card bg-white p-8 shadow-card">
          <p className="text-sm text-gray-text">Aucun compte Employé pour l'instant.</p>
        </section>
      ) : (
        <div className="flex flex-col gap-3">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-white p-4 shadow-card"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-navy">
                    {account.firstName} {account.lastName}
                  </p>
                  {!account.activatedAt && (
                    <span className="rounded-pill bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      En attente d'activation
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-text">
                  {account.email}
                  {account.phone && ` · ${account.phone}`}
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => handleResend(account.id)}
                  disabled={resendingId === account.id}
                  className="font-medium text-gray-text hover:text-navy disabled:opacity-40"
                >
                  {resendingId === account.id ? "Envoi…" : resentId === account.id ? "Invitation envoyée" : "Renvoyer l'invitation"}
                </button>
                <button type="button" onClick={() => setModal(account)} className="font-medium text-brand-mid hover:text-brand-start">
                  Modifier
                </button>
                <button type="button" onClick={() => setAccountToDelete(account)} className="font-medium text-red-500 hover:text-red-600">
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <AccountFormModal
          clientSiteId={clientSiteId}
          password={password}
          editing={modal === "create" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}

      {accountToDelete && (
        <ConfirmModal
          title={`Supprimer le compte "${accountToDelete.firstName} ${accountToDelete.lastName}" ?`}
          message="Cette personne ne pourra plus se connecter à l'admin de ce site."
          onConfirm={() => handleDelete(accountToDelete.id)}
          onCancel={() => setAccountToDelete(null)}
        />
      )}
    </div>
  );
}
