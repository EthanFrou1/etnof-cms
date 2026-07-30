// Voir docs/10-templates.md : un module reste isolé, redéclare localement le type Locale plutôt
// que d'importer celui du hook (même principe que ModulePalette dans BlogSection.tsx).
type Locale = "fr" | "en" | "es";

const LOCALES: { id: Locale; label: string }[] = [
  { id: "fr", label: "FR" },
  { id: "en", label: "EN" },
  { id: "es", label: "ES" },
];

type LanguageSwitcherProps = {
  locale: Locale;
  onChange: (locale: Locale) => void;
  accent: string;
};

export default function LanguageSwitcher({ locale, onChange, accent }: LanguageSwitcherProps) {
  return (
    <div className="flex items-center gap-1 text-sm font-semibold">
      {LOCALES.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => onChange(l.id)}
          className="rounded-pill px-2 py-1 transition-colors"
          style={
            l.id === locale
              ? { backgroundColor: accent, color: "#FFFFFF" }
              : { color: "inherit", opacity: 0.6 }
          }
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
