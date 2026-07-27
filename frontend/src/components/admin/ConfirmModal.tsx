type ConfirmModalProps = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

// Modal de confirmation générique (ex. avant une suppression) — un seul composant réutilisable
// partout dans l'admin plutôt qu'un window.confirm() ou une modal réécrite à chaque endroit.
export default function ConfirmModal({
  title,
  message,
  confirmLabel = "Supprimer",
  cancelLabel = "Annuler",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-card bg-white p-6 shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-navy">{title}</h2>
        {message && <p className="mt-2 text-sm leading-relaxed text-gray-text">{message}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-button border border-border-subtle px-4 py-2.5 font-semibold text-gray-text hover:bg-bg-page-start"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-button bg-red-500 px-4 py-2.5 font-semibold text-white hover:bg-red-600"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
