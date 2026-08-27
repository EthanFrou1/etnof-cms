import { useState } from "react";
import { IconCheck, IconCopy, IconEye, IconEyeOff } from "./admin/icons";

type SecretFieldProps = {
  value: string;
  onChange: (value: string) => void;
  className: string;
  placeholder?: string;
  autoComplete?: string;
};

// Champ `type="password"` avec bascule "afficher" + bouton "copier" — un mot de passe de connexion
// n'a besoin ni de l'un ni de l'autre (on le tape une fois), mais une clé secrète/API (Stripe,
// Brevo...) doit pouvoir être relue et recopiée ailleurs (ex. reporter la même clé de test entre le
// compte agence et un tenant). Ethan bloqué en pensant ne pas pouvoir copier ces champs — en réalité
// un `<input type="password">` reste copiable au clavier (Ctrl+A/Ctrl+C copie la vraie valeur, pas
// les points), mais sans repère visuel ni bouton dédié, ce n'était pas évident.
export default function SecretField({ value, onChange, className, placeholder, autoComplete = "off" }: SecretFieldProps) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative">
      <input
        className={`${className} w-full pr-16`}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Masquer" : "Afficher"}
          title={visible ? "Masquer" : "Afficher"}
          className="rounded p-1.5 text-gray-text hover:text-navy"
        >
          {visible ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!value}
          aria-label="Copier"
          title={copied ? "Copié !" : "Copier"}
          className={`rounded p-1.5 hover:text-navy disabled:cursor-not-allowed disabled:opacity-40 ${
            copied ? "text-green-accent" : "text-gray-text"
          }`}
        >
          {copied ? <IconCheck className="h-4 w-4" /> : <IconCopy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
