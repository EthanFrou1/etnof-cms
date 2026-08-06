namespace Modules.Pages;

// Même forme que BlogPost (modules/blog/backend/BlogPost.cs) — Title/Slug/Content/PublishedAt — plus
// SortOrder pour l'ordre choisi par le client dans le menu déroulant du header (voir CustomPagesNav.tsx).
public class CustomPage
{
    public Guid Id { get; set; }
    public Guid ClientSiteId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public DateTime? PublishedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
