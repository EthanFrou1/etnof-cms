type WhatsAppButtonProps = {
  phoneNumber: string;
  message: string;
};

// Icône officielle reconnaissable (fond vert WhatsApp) plutôt que la palette du template — décision
// d'Ethan : contrairement aux autres modules (Contact, Maps, Blog, Catalogue), un CTA WhatsApp doit
// rester identifiable au premier coup d'œil, voir docs/12-plan-modules-restants.md.
const WHATSAPP_GREEN = "#25D366";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
      <path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.34.652 4.523 1.78 6.386L4 29l7.86-1.74A11.93 11.93 0 0 0 16.001 27C22.627 27 28 21.627 28 15S22.627 3 16.001 3Zm0 21.818c-1.964 0-3.79-.57-5.33-1.553l-.383-.24-4.66 1.033 1.05-4.54-.25-.394A9.77 9.77 0 0 1 5.182 15c0-5.968 4.851-10.818 10.819-10.818S26.818 9.032 26.818 15 21.968 24.818 16.001 24.818Zm5.936-8.169c-.325-.163-1.923-.949-2.222-1.058-.298-.109-.516-.163-.733.163-.217.326-.84 1.058-1.03 1.276-.19.217-.38.245-.706.082-.325-.163-1.373-.506-2.615-1.612-.967-.862-1.62-1.927-1.81-2.253-.19-.326-.02-.502.143-.664.147-.146.326-.38.489-.57.163-.19.217-.326.326-.543.109-.217.054-.407-.027-.57-.082-.163-.733-1.767-1.005-2.42-.264-.636-.532-.55-.733-.56l-.624-.011c-.217 0-.57.082-.868.407-.298.326-1.137 1.112-1.137 2.712 0 1.6 1.164 3.146 1.327 3.363.163.217 2.29 3.497 5.55 4.905.775.334 1.38.534 1.852.684.778.247 1.487.212 2.047.129.624-.093 1.923-.786 2.195-1.545.271-.76.271-1.41.19-1.545-.082-.136-.298-.217-.624-.38Z" />
    </svg>
  );
}

// Pas de fetch/backend : le numéro et le message viennent directement de ModulesConfigJson (même
// mécanisme générique que modules/maps/apiKey), lus par le template appelant.
export default function WhatsAppButton({ phoneNumber, message }: WhatsAppButtonProps) {
  const digits = phoneNumber.replace(/[^0-9]/g, "");
  if (!digits) return null;

  const href = `https://wa.me/${digits}${message.trim() ? `?text=${encodeURIComponent(message.trim())}` : ""}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-6 left-6 z-40 flex items-center gap-2 rounded-pill px-5 py-3 text-sm font-semibold text-white shadow-soft transition-transform hover:scale-105"
      style={{ backgroundColor: WHATSAPP_GREEN }}
    >
      <WhatsAppIcon className="h-5 w-5" />
      WhatsApp
    </a>
  );
}
