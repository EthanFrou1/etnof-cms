namespace Modules.Blog;

public class BlogPost
{
    public Guid Id { get; set; }
    public Guid ClientSiteId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime? PublishedAt { get; set; }
}
