import { useState } from "react";
import { API_BASE_URL } from "../config";

const inputClass =
  "rounded-button border border-border-subtle bg-white px-3 py-2 text-navy placeholder:text-gray-text/60 focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20";

type AdminLoginFormProps = {
  loginPath: string;
  onLoggedIn: (token: string, expiresAt: number) => void;
  // Champ email en plus du mot de passe — seulement pertinent pour un login de tenant (comptes
  // "Employé", voir TenantAdminAccount.cs) : laisser vide connecte comme Propriétaire (comportement
  // inchangé), le remplir cherche un compte Employé correspondant. Absent côté agence (un seul
  // compte, pas de notion d'employé).
  showEmail?: boolean;
};

export default function AdminLoginForm({ loginPath, onLoggedIn, showEmail = false }: AdminLoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE_URL}${loginPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, email: showEmail && email.trim() ? email.trim() : null }),
    });

    if (res.ok) {
      const { token, expiresAt } = await res.json();
      onLoggedIn(token, expiresAt);
      // Rechargement complet plutôt qu'un simple remplacement du formulaire par du contenu React :
      // sans changement de page réel, les navigateurs (surtout Chrome) proposent beaucoup moins
      // fiablement d'enregistrer le mot de passe après une connexion en AJAX pur. `onLoggedIn` a déjà
      // écrit la session en sessionStorage avant ce reload, donc rien n'est perdu (voir
      // useAdminSession.ts, login()).
      window.location.reload();
    } else {
      setError(true);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-xs flex-col gap-3 rounded-card bg-white p-8 shadow-card"
    >
      {showEmail && (
        <input
          type="email"
          name="email"
          autoComplete="username"
          className={inputClass}
          placeholder="Email (compte Employé — laisser vide si Propriétaire)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
        />
      )}
      <input
        type="password"
        name="password"
        autoComplete="current-password"
        className={inputClass}
        placeholder="Mot de passe admin"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoFocus={!showEmail}
      />
      <button
        type="submit"
        className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white hover:opacity-90"
      >
        Se connecter
      </button>
      {error && <p className="text-sm text-red-500">Mot de passe incorrect.</p>}
    </form>
  );
}
