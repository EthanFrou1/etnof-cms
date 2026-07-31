import { useState } from "react";
import { API_BASE_URL } from "../config";

const inputClass =
  "rounded-button border border-border-subtle bg-white px-3 py-2 text-navy placeholder:text-gray-text/60 focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20";

type AdminLoginFormProps = {
  loginPath: string;
  onLoggedIn: (token: string, expiresAt: number) => void;
};

export default function AdminLoginForm({ loginPath, onLoggedIn }: AdminLoginFormProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE_URL}${loginPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      const { token, expiresAt } = await res.json();
      onLoggedIn(token, expiresAt);
    } else {
      setError(true);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-xs flex-col gap-3 rounded-card bg-white p-8 shadow-card"
    >
      <input
        type="password"
        className={inputClass}
        placeholder="Mot de passe admin"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoFocus
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
