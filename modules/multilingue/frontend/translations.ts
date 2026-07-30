// Dictionnaire des textes fixes de l'interface publique (nav, libellés de section, formulaires des
// modules...) — distinct du contenu traduit par le client (SiteContent/Offer/BlogPost, voir
// ContentTranslation côté backend) qui, lui, vit en base et se traduit depuis /admin/{id}/multilingue.
// Ce fichier ne change JAMAIS depuis l'admin : c'est le même texte pour tous les tenants, seulement
// affiché dans la langue choisie par le visiteur.
//
// Écart assumé à "un module reste isolé" (docs/02-architecture-modules.md) : chaque module public
// (Contact, RDV, Newsletter, Avis Google, Catalogue, Blog) importe ce fichier directement plutôt que
// de dupliquer ~50 chaînes dans chacun — l'i18n est par nature transverse, comme le module
// Multilingue lui-même (voir docs/12-plan-modules-restants.md, catégorie B).
export type Locale = "fr" | "en" | "es";

type Dict = Record<string, string>;

const fr: Dict = {
  "nav.catalogue": "Catalogue",
  "nav.blog": "Blog",
  "nav.rdv": "Rendez-vous",
  "nav.contact": "Contact",
  "nav.newsletter": "Newsletter",
  "nav.avisGoogle": "Avis",

  "hero.welcome": "Bienvenue",
  "section.establishment": "Établissement",
  "section.hours": "Horaires",
  "section.offers": "Offres",
  "section.offerOfTheMoment": "Offre du moment",
  "hours.closed": "Fermé",

  "weekday.mon": "Lun",
  "weekday.tue": "Mar",
  "weekday.wed": "Mer",
  "weekday.thu": "Jeu",
  "weekday.fri": "Ven",
  "weekday.sat": "Sam",
  "weekday.sun": "Dim",

  "contact.label": "Contact",
  "contact.title": "Une question ?",
  "contact.name": "Nom",
  "contact.namePlaceholder": "Votre nom",
  "contact.email": "Email",
  "contact.emailPlaceholder": "vous@exemple.fr",
  "contact.message": "Message",
  "contact.messagePlaceholder": "Votre message",
  "contact.submit": "Envoyer",
  "contact.sent": "Message envoyé !",
  "contact.error": "Erreur, réessaie.",

  "maps.findUs": "Où nous trouver",

  "rdv.label": "Rendez-vous",
  "rdv.title": "Réserver un créneau",
  "rdv.loading": "Chargement des créneaux…",
  "rdv.noSlots": "Aucun créneau disponible pour le moment.",
  "rdv.name": "Nom",
  "rdv.namePlaceholder": "Votre nom",
  "rdv.email": "Email",
  "rdv.emailPlaceholder": "vous@exemple.fr",
  "rdv.phone": "Téléphone",
  "rdv.phonePlaceholder": "06 12 34 56 78",
  "rdv.note": "Précision (facultatif)",
  "rdv.notePlaceholder": "Un détail à préciser ?",
  "rdv.confirm": "Confirmer le rendez-vous",
  "rdv.confirmed": "Rendez-vous confirmé !",
  "rdv.genericError": "Erreur d'envoi, réessaie.",

  "newsletter.label": "Newsletter",
  "newsletter.title": "Restez informé",
  "newsletter.description": "Inscrivez-vous pour recevoir nos actualités et offres.",
  "newsletter.emailPlaceholder": "vous@exemple.fr",
  "newsletter.submit": "S'inscrire",
  "newsletter.sent": "Merci de votre inscription !",
  "newsletter.error": "Erreur, réessaie.",

  "avisGoogle.label": "Avis Google",
  "avisGoogle.title": "Ce qu'en disent nos clients",
  "avisGoogle.reviewsCount": "avis",

  "blog.backToSite": "← Retour au site",
  "blog.notFound": "Article introuvable.",

  "catalogue.label": "Catalogue",
  "catalogue.noPhoto": "Pas de photo",
  "catalogue.inStock": "En stock",
  "catalogue.outOfStock": "Rupture de stock",
  "catalogue.addToCart": "Ajouter au panier",
  "catalogue.cart": "Panier",
  "catalogue.cartEmpty": "Le panier est vide.",
  "catalogue.remove": "Retirer",
  "catalogue.total": "Total",
  "catalogue.perUnit": "/ unité",
  "catalogue.namePlaceholder": "Nom",
  "catalogue.emailPlaceholder": "Email",
  "catalogue.payByCard": "Payer par carte",
  "catalogue.redirecting": "Redirection…",
  "catalogue.paymentUnavailable": "Le paiement en ligne n'est pas encore disponible sur ce site.",
  "catalogue.close": "Fermer",
  "catalogue.checkoutFailed": "Le paiement n'a pas pu être initié.",
  "catalogue.paymentReceived": "Paiement reçu — merci pour votre commande de {price} !",
  "catalogue.orderRecorded": "Commande enregistrée — merci !",
  "catalogue.paymentCancelled": "Paiement annulé — votre panier a été conservé.",
};

const en: Dict = {
  "nav.catalogue": "Shop",
  "nav.blog": "Blog",
  "nav.rdv": "Book now",
  "nav.contact": "Contact",
  "nav.newsletter": "Newsletter",
  "nav.avisGoogle": "Reviews",

  "hero.welcome": "Welcome",
  "section.establishment": "About us",
  "section.hours": "Opening hours",
  "section.offers": "Offers",
  "section.offerOfTheMoment": "Featured offer",
  "hours.closed": "Closed",

  "weekday.mon": "Mon",
  "weekday.tue": "Tue",
  "weekday.wed": "Wed",
  "weekday.thu": "Thu",
  "weekday.fri": "Fri",
  "weekday.sat": "Sat",
  "weekday.sun": "Sun",

  "contact.label": "Contact",
  "contact.title": "Got a question?",
  "contact.name": "Name",
  "contact.namePlaceholder": "Your name",
  "contact.email": "Email",
  "contact.emailPlaceholder": "you@example.com",
  "contact.message": "Message",
  "contact.messagePlaceholder": "Your message",
  "contact.submit": "Send",
  "contact.sent": "Message sent!",
  "contact.error": "Something went wrong, try again.",

  "maps.findUs": "Find us",

  "rdv.label": "Appointments",
  "rdv.title": "Book a slot",
  "rdv.loading": "Loading available slots…",
  "rdv.noSlots": "No slots available right now.",
  "rdv.name": "Name",
  "rdv.namePlaceholder": "Your name",
  "rdv.email": "Email",
  "rdv.emailPlaceholder": "you@example.com",
  "rdv.phone": "Phone",
  "rdv.phonePlaceholder": "+1 555 123 4567",
  "rdv.note": "Note (optional)",
  "rdv.notePlaceholder": "Anything we should know?",
  "rdv.confirm": "Confirm appointment",
  "rdv.confirmed": "Appointment confirmed!",
  "rdv.genericError": "Something went wrong, try again.",

  "newsletter.label": "Newsletter",
  "newsletter.title": "Stay in the loop",
  "newsletter.description": "Subscribe to get our news and offers.",
  "newsletter.emailPlaceholder": "you@example.com",
  "newsletter.submit": "Subscribe",
  "newsletter.sent": "Thanks for subscribing!",
  "newsletter.error": "Something went wrong, try again.",

  "avisGoogle.label": "Google Reviews",
  "avisGoogle.title": "What our customers say",
  "avisGoogle.reviewsCount": "reviews",

  "blog.backToSite": "← Back to site",
  "blog.notFound": "Article not found.",

  "catalogue.label": "Shop",
  "catalogue.noPhoto": "No photo",
  "catalogue.inStock": "In stock",
  "catalogue.outOfStock": "Out of stock",
  "catalogue.addToCart": "Add to cart",
  "catalogue.cart": "Cart",
  "catalogue.cartEmpty": "Your cart is empty.",
  "catalogue.remove": "Remove",
  "catalogue.total": "Total",
  "catalogue.perUnit": "/ unit",
  "catalogue.namePlaceholder": "Name",
  "catalogue.emailPlaceholder": "Email",
  "catalogue.payByCard": "Pay by card",
  "catalogue.redirecting": "Redirecting…",
  "catalogue.paymentUnavailable": "Online payment isn't available on this site yet.",
  "catalogue.close": "Close",
  "catalogue.checkoutFailed": "Payment could not be started.",
  "catalogue.paymentReceived": "Payment received — thank you for your order of {price}!",
  "catalogue.orderRecorded": "Order recorded — thank you!",
  "catalogue.paymentCancelled": "Payment cancelled — your cart has been kept.",
};

const es: Dict = {
  "nav.catalogue": "Tienda",
  "nav.blog": "Blog",
  "nav.rdv": "Reservar",
  "nav.contact": "Contacto",
  "nav.newsletter": "Newsletter",
  "nav.avisGoogle": "Reseñas",

  "hero.welcome": "Bienvenido",
  "section.establishment": "Sobre nosotros",
  "section.hours": "Horario",
  "section.offers": "Ofertas",
  "section.offerOfTheMoment": "Oferta destacada",
  "hours.closed": "Cerrado",

  "weekday.mon": "Lun",
  "weekday.tue": "Mar",
  "weekday.wed": "Mié",
  "weekday.thu": "Jue",
  "weekday.fri": "Vie",
  "weekday.sat": "Sáb",
  "weekday.sun": "Dom",

  "contact.label": "Contacto",
  "contact.title": "¿Alguna pregunta?",
  "contact.name": "Nombre",
  "contact.namePlaceholder": "Tu nombre",
  "contact.email": "Email",
  "contact.emailPlaceholder": "tu@ejemplo.com",
  "contact.message": "Mensaje",
  "contact.messagePlaceholder": "Tu mensaje",
  "contact.submit": "Enviar",
  "contact.sent": "¡Mensaje enviado!",
  "contact.error": "Error, inténtalo de nuevo.",

  "maps.findUs": "Cómo llegar",

  "rdv.label": "Citas",
  "rdv.title": "Reservar una cita",
  "rdv.loading": "Cargando horarios disponibles…",
  "rdv.noSlots": "No hay horarios disponibles por ahora.",
  "rdv.name": "Nombre",
  "rdv.namePlaceholder": "Tu nombre",
  "rdv.email": "Email",
  "rdv.emailPlaceholder": "tu@ejemplo.com",
  "rdv.phone": "Teléfono",
  "rdv.phonePlaceholder": "+34 612 34 56 78",
  "rdv.note": "Nota (opcional)",
  "rdv.notePlaceholder": "¿Algo que debamos saber?",
  "rdv.confirm": "Confirmar cita",
  "rdv.confirmed": "¡Cita confirmada!",
  "rdv.genericError": "Error, inténtalo de nuevo.",

  "newsletter.label": "Newsletter",
  "newsletter.title": "Mantente informado",
  "newsletter.description": "Suscríbete para recibir nuestras novedades y ofertas.",
  "newsletter.emailPlaceholder": "tu@ejemplo.com",
  "newsletter.submit": "Suscribirse",
  "newsletter.sent": "¡Gracias por suscribirte!",
  "newsletter.error": "Error, inténtalo de nuevo.",

  "avisGoogle.label": "Reseñas de Google",
  "avisGoogle.title": "Lo que dicen nuestros clientes",
  "avisGoogle.reviewsCount": "reseñas",

  "blog.backToSite": "← Volver al sitio",
  "blog.notFound": "Artículo no encontrado.",

  "catalogue.label": "Tienda",
  "catalogue.noPhoto": "Sin foto",
  "catalogue.inStock": "En stock",
  "catalogue.outOfStock": "Agotado",
  "catalogue.addToCart": "Añadir al carrito",
  "catalogue.cart": "Carrito",
  "catalogue.cartEmpty": "Tu carrito está vacío.",
  "catalogue.remove": "Quitar",
  "catalogue.total": "Total",
  "catalogue.perUnit": "/ unidad",
  "catalogue.namePlaceholder": "Nombre",
  "catalogue.emailPlaceholder": "Email",
  "catalogue.payByCard": "Pagar con tarjeta",
  "catalogue.redirecting": "Redirigiendo…",
  "catalogue.paymentUnavailable": "El pago en línea no está disponible todavía en este sitio.",
  "catalogue.close": "Cerrar",
  "catalogue.checkoutFailed": "No se pudo iniciar el pago.",
  "catalogue.paymentReceived": "Pago recibido — ¡gracias por tu pedido de {price}!",
  "catalogue.orderRecorded": "Pedido registrado — ¡gracias!",
  "catalogue.paymentCancelled": "Pago cancelado — tu carrito se ha conservado.",
};

const UI_STRINGS: Record<Locale, Dict> = { fr, en, es };

// "fr"/absent -> français direct, "en"/"es" -> dictionnaire correspondant avec repli sur le
// français si une clé manque (ne devrait pas arriver, filet de sécurité). `vars` remplace les
// "{placeholder}" dans le texte (ex. le prix dans le message de confirmation de paiement).
export function t(locale: Locale | string | undefined, key: string, vars?: Record<string, string>): string {
  const loc: Locale = locale === "en" || locale === "es" ? locale : "fr";
  const text = UI_STRINGS[loc][key] ?? UI_STRINGS.fr[key] ?? key;
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? "");
}

// Pour Date.toLocaleDateString/toLocaleTimeString (RdvSection, BlogSection) — Intl gère déjà les
// noms de jour/mois complets une fois la bonne locale IETF fournie, pas besoin de les dupliquer ici.
export function localeTag(locale: Locale | string | undefined): string {
  if (locale === "en") return "en-US";
  if (locale === "es") return "es-ES";
  return "fr-FR";
}
