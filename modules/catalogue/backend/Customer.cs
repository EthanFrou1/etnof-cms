namespace Modules.Catalogue;

public class Customer
{
    public Guid Id { get; set; }
    public Guid ClientSiteId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;

    // Adresse structurée (rue, complément optionnel, code postal, ville, pays) plutôt qu'un seul
    // champ libre — nécessaire pour qu'un transporteur puisse réellement livrer sans ambiguïté,
    // comme le fait un checkout Zara-like. Remplace l'ancien champ unique `Address` (voir migration
    // AddCustomerAddressFields, qui backfille AddressLine1 depuis l'ancienne colonne).
    public string AddressLine1 { get; set; } = string.Empty;
    public string AddressLine2 { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Country { get; set; } = "France";

    public string Notes { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
