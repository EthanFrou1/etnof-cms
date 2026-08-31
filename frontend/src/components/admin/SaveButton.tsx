import { useEffect } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

type SaveButtonProps = {
  status: SaveStatus;
  onClick: () => void;
  // Repasse le parent à "idle" ~3s après "saved" OU "error" (demande d'Ethan : plus de texte
  // "Enregistré"/erreur à côté du bouton, le bouton lui-même change de couleur/libellé puis revient
  // à son état normal). Le composant possède le minuteur, le parent reste propriétaire de son état.
  onIdle: () => void;
  disabled?: boolean;
  idleLabel?: string;
  errorLabel?: string;
  // "md" (défaut) : gros bouton plein — un seul par page (Établissement, fiche produit…). "sm" :
  // variante discrète en contour, pour une action répétée par ligne (traduction d'une offre, d'un
  // avis…) où un gros bouton rempli par ligne serait trop lourd visuellement.
  size?: "md" | "sm";
  // Remplace `bg-brand-gradient` en état "idle" — pour les pages hors admin/agence dont la couleur
  // de marque vient de la palette du tenant plutôt que des classes Tailwind fixes de l'admin (ex.
  // AccountPage.tsx). Les couleurs "saved"/"error" restent le vert/rouge universels, inchangées.
  idleColor?: string;
};

// Bouton "Enregistrer" partagé par l'admin d'un tenant — remplace le pattern répété dans chaque
// section (bouton + `<span>Enregistré</span>` séparé à côté) par un seul élément qui porte lui-même
// le spinner de chargement, la couleur de succès/erreur et le retour automatique à l'état normal.
export default function SaveButton({
  status,
  onClick,
  onIdle,
  disabled = false,
  idleLabel = "Enregistrer",
  errorLabel = "Erreur",
  size = "md",
  idleColor,
}: SaveButtonProps) {
  useEffect(() => {
    if (status !== "saved" && status !== "error") return;
    const timeout = setTimeout(onIdle, 3000);
    return () => clearTimeout(timeout);
  }, [status, onIdle]);

  const isSaving = status === "saving";
  const isSaved = status === "saved";
  const isError = status === "error";
  // "saved"/"error" ne doivent plus être cliquables (juste une confirmation transitoire, 3s) mais
  // gardent leur couleur pleine — contrairement à `disabled`, qui les aurait ternies via
  // disabled:opacity-40, pensé pour l'état "saving" seulement.
  const isLocked = isSaved || isError;

  const sizeClass = size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2.5 font-semibold";
  const spinnerSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  const variantClass =
    size === "sm"
      ? isSaved
        ? "border border-green-accent text-green-accent"
        : isError
        ? "border border-red-500 text-red-500"
        : "border border-border-subtle text-gray-text hover:bg-bg-page-start"
      : `text-white hover:opacity-90 ${isSaved ? "bg-green-accent" : isError ? "bg-red-500" : idleColor ? "" : "bg-brand-gradient"}`;

  const spinnerColorClass = size === "sm" ? "border-gray-text/30 border-t-gray-text" : "border-white/40 border-t-white";
  const idleStyle = !isSaved && !isError && idleColor ? { backgroundColor: idleColor } : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isSaving}
      aria-disabled={isLocked}
      style={idleStyle}
      className={`flex shrink-0 items-center gap-2 rounded-button font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${sizeClass} ${variantClass} ${isLocked ? "pointer-events-none cursor-default" : ""}`}
    >
      {isSaving && <span className={`inline-block ${spinnerSize} shrink-0 animate-spin rounded-full border-2 ${spinnerColorClass}`} />}
      {isSaved ? "Enregistré" : isError ? errorLabel : idleLabel}
    </button>
  );
}
