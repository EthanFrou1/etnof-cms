import type { SiteContent } from "../hooks/useContent";

type SiteFooterProps = {
  content: SiteContent | null;
  palette: { accent: string; background: string; ink: string };
  // Variante fond sombre (maquette Hestia, docs/10-templates.md) : le footer devient une bande
  // pleine largeur en `palette.ink`, texte clair — gère alors sa propre largeur (le gabarit
  // appelant ne doit plus l'envelopper dans un conteneur `max-w`). Par défaut (Helios, pas encore
  // repris) : comportement inchangé, simple bloc de texte inséré dans le conteneur du gabarit.
  dark?: boolean;
};

// Les horaires ne sont plus affichés ici : ils ont leur propre section dédiée sur la page (gardée
// par le module "horaires", voir TemplateHestia.tsx) — le footer ne garde que les faits qui n'ont
// pas de section propre (nom, adresse, téléphone, email). Plus de lien vers l'admin (retiré à la
// demande d'Ethan) : le site public ne renvoie plus vers `/admin`.
export default function SiteFooter({ content, palette, dark = false }: SiteFooterProps) {
  const name = content?.establishmentName || content?.siteName;
  const hasContactInfo = Boolean(content?.address || content?.phone || content?.email);

  if (!name && !hasContactInfo) return null;

  if (dark) {
    return (
      <footer style={{ backgroundColor: palette.ink }}>
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-1.5 px-4 py-14 text-center text-sm sm:px-8">
          {name && (
            <span className="mb-1 text-lg font-black" style={{ color: palette.background }}>
              {name}
            </span>
          )}
          {content?.address && <span style={{ color: `${palette.background}B3` }}>{content.address}</span>}
          {content?.phone && <span style={{ color: `${palette.background}B3` }}>{content.phone}</span>}
          {content?.email && <span style={{ color: `${palette.background}B3` }}>{content.email}</span>}
        </div>
      </footer>
    );
  }

  return (
    <footer
      className="flex flex-col gap-1.5 border-t pb-8 pt-8 text-sm"
      style={{ borderColor: `${palette.ink}1A`, color: `${palette.ink}B3` }}
    >
      {name && (
        <span className="text-base font-bold" style={{ color: palette.ink }}>
          {name}
        </span>
      )}
      {content?.address && <span>{content.address}</span>}
      {content?.phone && <span>{content.phone}</span>}
      {content?.email && <span>{content.email}</span>}
    </footer>
  );
}
