type SocialLinksProps = {
  facebookUrl?: string;
  instagramUrl?: string;
};

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M22 12.06C22 6.505 17.523 2 12 2S2 6.505 2 12.06c0 5.02 3.657 9.184 8.438 9.94v-7.03H7.898v-2.91h2.54V9.845c0-2.507 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.459h-1.26c-1.243 0-1.63.771-1.63 1.562v1.878h2.773l-.443 2.91h-2.33V22c4.78-.756 8.437-4.92 8.437-9.94Z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Couleurs de marque officielles plutôt que la palette du template — même rationale que
// modules/whatsapp/frontend/WhatsAppButton.tsx (reconnaissance immédiate d'une icône Facebook/Instagram).
const BRAND_COLORS = {
  facebook: "#1877F2",
  instagram: "#E1306C",
} as const;

type NetworkKey = keyof typeof BRAND_COLORS;

// Pas de fetch/backend, comme WhatsApp : les URLs viennent directement de ModulesConfigJson, lues
// par SiteFooter.tsx qui rend ce composant. Chaque icône est indépendamment masquée si son URL est
// vide (un client peut n'avoir qu'un Facebook, ou qu'un Instagram).
export default function SocialLinks({ facebookUrl, instagramUrl }: SocialLinksProps) {
  const links: { key: NetworkKey; href: string; label: string; Icon: typeof FacebookIcon }[] = [];
  if (facebookUrl?.trim()) links.push({ key: "facebook", href: facebookUrl.trim(), label: "Facebook", Icon: FacebookIcon });
  if (instagramUrl?.trim()) links.push({ key: "instagram", href: instagramUrl.trim(), label: "Instagram", Icon: InstagramIcon });

  if (links.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {links.map(({ key, href, label, Icon }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={label}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-opacity hover:opacity-85"
          style={{ backgroundColor: BRAND_COLORS[key] }}
        >
          <Icon className="h-4.5 w-4.5" />
        </a>
      ))}
    </div>
  );
}
