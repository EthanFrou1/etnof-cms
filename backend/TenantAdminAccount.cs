namespace Backend;

// Compte "Employé" d'un tenant — accès restreint à l'admin, distinct du mot de passe unique du
// tenant (ClientSite.PasswordHash) qui reste le compte "Propriétaire" implicite (jamais dupliqué
// dans cette table). Un seul rôle existe pour l'instant : la présence d'une ligne ici EST le rôle
// "Employé" — pas de colonne Role ni de moteur de permissions configurable, cf. CLAUDE.md règle 7
// (starter-kit solo, pas de sur-ingénierie). Voir TenantAdminAuth.IsOwnerAuthorizedAsync pour ce qui
// reste hors de portée d'un compte Employé (Modules, Paiement Stripe, gestion des comptes).
//
// Connexion quotidienne par email + mot de passe (pas de lien magique à chaque fois, décision
// d'Ethan — plus simple pour un employé qui se reconnecte souvent). Mais le mot de passe lui-même
// n'est jamais choisi/vu par le Propriétaire : PasswordHash reste vide à la création, un email
// d'invitation (TenantAdminAccountInvite) laisse l'employé le définir lui-même, comme un compte réel
// plutôt qu'un mot de passe distribué à la main.
public class TenantAdminAccount
{
    public Guid Id { get; set; }
    public Guid ClientSiteId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    // Null tant que l'employé n'a pas suivi le lien d'invitation et défini son mot de passe —
    // affiché comme "En attente" dans AccountsSection.tsx.
    public DateTime? ActivatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

// Lien d'invitation à usage unique envoyé par email (voir TenantAdminEndpoints.cs) — même principe
// que CustomerLoginToken.cs (module Compte client) : en base plutôt qu'un token signé sans état, une
// validation en 2 temps (GET affiche "Définir mon mot de passe", seul un POST derrière un vrai clic
// active le compte) a besoin d'un état serveur pour empêcher le rejeu et pour ne pas être "grillé"
// par un scanner de sécurité de messagerie qui pré-visite les liens d'un email. TTL plus long que le
// lien de connexion Compte client (48h contre 15 min) : une invitation n'est pas une connexion
// routinière, l'employé peut mettre plus de temps à l'ouvrir.
public class TenantAdminAccountInvite
{
    public Guid Id { get; set; }
    public Guid ClientSiteId { get; set; }
    public Guid AccountId { get; set; }
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime? UsedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
