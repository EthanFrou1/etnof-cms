import { useEffect, useMemo, useRef, useState } from "react";
import { AsYouType, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";
import Select from "./Select";

const inputClass =
  "rounded-button border border-border-subtle bg-white px-3 py-2 text-navy placeholder:text-gray-text/60 focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20";

// Pays courants pour une clientèle française/francophone — pas la liste complète des ~240 pays
// gérés par libphonenumber-js, pour garder le sélecteur simple à parcourir (voir "rester simple",
// CLAUDE.md). Le drapeau est généré depuis le code pays (ISO 3166-1 alpha-2), pas une image.
export const COUNTRIES: { code: CountryCode; name: string }[] = [
  { code: "FR", name: "France" },
  { code: "BE", name: "Belgique" },
  { code: "CH", name: "Suisse" },
  { code: "LU", name: "Luxembourg" },
  { code: "MC", name: "Monaco" },
  { code: "GP", name: "Guadeloupe" },
  { code: "MQ", name: "Martinique" },
  { code: "RE", name: "Réunion" },
  { code: "CA", name: "Canada" },
  { code: "US", name: "États-Unis" },
  { code: "GB", name: "Royaume-Uni" },
  { code: "DE", name: "Allemagne" },
  { code: "ES", name: "Espagne" },
  { code: "IT", name: "Italie" },
  { code: "PT", name: "Portugal" },
  { code: "NL", name: "Pays-Bas" },
  { code: "MA", name: "Maroc" },
  { code: "DZ", name: "Algérie" },
  { code: "TN", name: "Tunisie" },
  { code: "SN", name: "Sénégal" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "CM", name: "Cameroun" },
];

function flagEmoji(countryCode: string) {
  return countryCode
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

const countryOptions = COUNTRIES.map((c) => ({
  value: c.code as string,
  label: `${flagEmoji(c.code)} ${c.name} (+${getCountryCallingCode(c.code)})`,
}));

type PhoneInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

// Numéro de téléphone avec sélecteur de pays (indicatif automatique) et validation via
// libphonenumber-js (mêmes règles que Google/WhatsApp/Stripe) — demandé par Ethan après avoir vu
// un numéro invalide ("+33 6 98 76 54 32sasa") enregistré tel quel faute de vérification, voir
// EstablishmentSection.tsx. Reste un champ texte classique pour le composant parent : `value`/
// `onChange` échangent une chaîne au format international ("+33 6 98 76 54 32"), rien de plus.
export default function PhoneInput({ value, onChange, placeholder }: PhoneInputProps) {
  const [country, setCountry] = useState<CountryCode>(
    () => parsePhoneNumberFromString(value || "", "FR")?.country ?? "FR"
  );
  const [rawDigits, setRawDigits] = useState<string>(
    () => parsePhoneNumberFromString(value || "", "FR")?.nationalNumber ?? value.replace(/\D/g, "")
  );
  const [touched, setTouched] = useState(false);

  // Ne resynchronise depuis `value` que quand le changement vient de l'extérieur (chargement
  // initial des données) — jamais après notre propre appel à onChange, sinon le composant écraserait
  // la frappe en cours de l'utilisateur à chaque re-render du parent.
  const lastEmitted = useRef<string | null>(null);
  useEffect(() => {
    if (value === lastEmitted.current) return;
    const parsed = parsePhoneNumberFromString(value || "", "FR");
    setCountry(parsed?.country ?? "FR");
    setRawDigits(parsed?.nationalNumber ?? value.replace(/\D/g, ""));
  }, [value]);

  // `AsYouType` est un formateur à état, pensé pour être nourri caractère par caractère au fil de la
  // frappe (voir doc libphonenumber-js) — c'est justement ce qui lui permet d'insérer les espaces
  // au bon endroit à mesure que l'utilisateur tape. Recréer une instance et lui donner toute la
  // chaîne d'un coup à chaque rendu (comme avant) désactive ce comportement incrémental : le numéro
  // reste affiché sans espaces ("612345678" au lieu de "6 12 34 56 78", bug relevé par Ethan). On
  // garde donc une instance persistante entre les rendus (ref) et ne lui donne que les caractères
  // ajoutés depuis le dernier passage — sauf en cas de suppression/collage (la chaîne ne commence
  // plus par ce qui a déjà été nourri), où l'on repart de zéro avec `reset()`.
  const formatterRef = useRef({ country, instance: new AsYouType(country), fed: "" });

  const { display, isValid, international } = useMemo(() => {
    let state = formatterRef.current;
    if (state.country !== country) {
      state = { country, instance: new AsYouType(country), fed: "" };
    }

    let formatted: string;
    if (rawDigits.startsWith(state.fed)) {
      formatted = state.instance.input(rawDigits.slice(state.fed.length));
    } else {
      state.instance.reset();
      formatted = state.instance.input(rawDigits);
    }

    formatterRef.current = { ...state, fed: rawDigits };

    const number = state.instance.getNumber();
    return {
      display: formatted,
      isValid: number?.isValid() ?? false,
      international: number?.formatInternational(),
    };
  }, [country, rawDigits]);

  useEffect(() => {
    const next = rawDigits ? international ?? `+${getCountryCallingCode(country)} ${display}` : "";
    if (next === value) return;
    lastEmitted.current = next;
    onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, rawDigits]);

  const showError = touched && rawDigits.length > 0 && !isValid;

  return (
    <div>
      <div className="flex gap-2">
        <div className="w-48 shrink-0">
          <Select
            className={inputClass}
            value={country}
            onChange={(v) => setCountry(v as CountryCode)}
            options={countryOptions}
          />
        </div>
        <input
          type="tel"
          className={`w-full ${inputClass} ${showError ? "border-red-400 focus:border-red-400 focus:ring-red-400/20" : ""}`}
          value={display}
          onChange={(e) => setRawDigits(e.target.value.replace(/\D/g, ""))}
          onBlur={() => setTouched(true)}
          placeholder={placeholder}
        />
      </div>
      {showError && (
        <p className="mt-1 text-xs text-red-500">
          Numéro invalide pour {COUNTRIES.find((c) => c.code === country)?.name ?? country}.
        </p>
      )}
    </div>
  );
}
