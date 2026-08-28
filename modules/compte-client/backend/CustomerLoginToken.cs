namespace Modules.CompteClient;

// Lien de connexion à usage unique envoyé par email (voir CompteClientModule.cs) — volontairement en
// base plutôt qu'un token signé sans état (comme CustomerToken.cs) : la validation en 2 temps
// (GET pour afficher "Confirmer la connexion ?", POST pour l'établir réellement) a besoin de savoir
// si le lien a déjà servi, ce qu'un simple token signé ne peut pas exprimer sans état côté serveur.
// Le GET seul ne consomme jamais le lien — nécessaire pour ne pas être "grillé" par les scanners de
// sécurité de certaines messageries (Outlook Safe Links, Proofpoint...) qui visitent automatiquement
// les liens contenus dans un email avant que l'utilisateur ne clique lui-même.
public class CustomerLoginToken
{
    public Guid Id { get; set; }
    public Guid ClientSiteId { get; set; }
    public Guid CustomerId { get; set; }
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime? UsedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
