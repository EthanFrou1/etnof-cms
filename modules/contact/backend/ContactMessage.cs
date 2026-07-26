namespace Modules.Contact;

public class ContactMessage
{
    public Guid Id { get; set; }
    public Guid ClientSiteId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
