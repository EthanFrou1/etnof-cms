namespace Modules.Newsletter;

public class NewsletterSubscriber
{
    public Guid Id { get; set; }
    public Guid ClientSiteId { get; set; }
    public string Email { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
