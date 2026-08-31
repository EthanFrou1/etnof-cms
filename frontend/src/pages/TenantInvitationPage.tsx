import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";
import { useAdminSession } from "../hooks/useAdminSession";

type TenantInvitationPageProps = {
  clientSiteId: string;
};

const inputClass =
  "rounded-button border border-border-subtle bg-white px-3 py-2 text-navy placeholder:text-gray-text/60 focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20";

// Suite de l'invitation envoyée par email à un compte "Employé" (voir TenantAdminEndpoints.cs,
// BrevoEmailService.SendTenantAdminInviteAsync) — l'employé définit lui-même son mot de passe ici,
// jamais choisi/transmis par le Propriétaire. Même principe de validation en 2 temps que
// modules/compte-client/frontend/AccountPage.tsx (ConfirmLoginView) : le GET (vérifié au chargement)
// ne consomme jamais le lien, seul le clic explicite sur "Activer mon compte" (POST confirm) le fait.
export default function TenantInvitationPage({ clientSiteId }: TenantInvitationPageProps) {
  const { login } = useAdminSession(clientSiteId);
  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  const [state, setState] = useState<"checking" | "valid" | "invalid" | "confirming">("checking");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    fetch(`${API_BASE_URL}/api/t/${clientSiteId}/admin/accounts/invitation?token=${encodeURIComponent(token)}`)
      .then((res) => (res.ok ? res.json() : { valid: false }))
      .then((data: { valid: boolean; firstName?: string; email?: string }) => {
        setState(data.valid ? "valid" : "invalid");
        setFirstName(data.firstName ?? "");
        setEmail(data.email ?? "");
      })
      .catch(() => setState("invalid"));
  }, [clientSiteId, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setState("confirming");
    const res = await fetch(`${API_BASE_URL}/api/t/${clientSiteId}/admin/accounts/invitation/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Erreur lors de l'activation.");
      setState("valid");
      return;
    }

    const data: { token: string; expiresAt: number } = await res.json();
    login(data.token, data.expiresAt);
    window.location.href = `/admin/${clientSiteId}`;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <span className="text-2xl font-extrabold text-white">
          Admin<span className="text-green-accent">Pro</span>
        </span>

        {state === "checking" ? null : state === "invalid" ? (
          <p className="text-center text-sm text-white/60">
            Ce lien d'invitation n'est plus valide. Demande au Propriétaire du site de te renvoyer une invitation.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex w-full max-w-xs flex-col gap-3 rounded-card bg-white p-8 shadow-card"
          >
            <p className="text-sm text-gray-text">
              {firstName ? `Bonjour ${firstName}, définis` : "Définis"} ton mot de passe pour activer ton compte.
            </p>
            {/* autoComplete="username" masqué visuellement (pas `hidden`/`display:none` : certains
                navigateurs ignorent alors le champ) — sans un champ identifiant quelconque, le
                gestionnaire de mots de passe propose moins fiablement d'enregistrer le mot de passe
                d'un formulaire de création de compte. Voir aussi AdminLoginForm.tsx. */}
            <input type="email" name="email" autoComplete="username" value={email} readOnly className="sr-only" />
            <input
              type="password"
              name="new-password"
              autoComplete="new-password"
              className={inputClass}
              placeholder="Mot de passe (8 caractères min.)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <input
              type="password"
              name="confirm-password"
              autoComplete="new-password"
              className={inputClass}
              placeholder="Confirmer le mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={state === "confirming"}
              className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {state === "confirming" ? "Activation…" : "Activer mon compte"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
