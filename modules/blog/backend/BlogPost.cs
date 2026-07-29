namespace Modules.Blog;

public class BlogPost
{
    public Guid Id { get; set; }
    public Guid ClientSiteId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime? PublishedAt { get; set; }

    // Ajouté avec l'admin Blog (2026-07-29) : sert à trier la liste par "créé le" indépendamment
    // de la publication (un brouillon n'a pas de PublishedAt) — voir BlogAdminEndpoints.cs.
    public DateTime CreatedAt { get; set; }
}
