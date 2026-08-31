using System.Text;
using Microsoft.EntityFrameworkCore;
using Modules.Blog;
using Modules.Pages;

namespace Backend;

// SEO avancé (2026-08-31) : sitemap.xml + robots.txt par tenant, en plus des données structurées
// JSON-LD posées côté frontend (voir frontend/src/utils/structuredData.ts). Servis sous
// /api/t/{clientSiteId}/... comme le reste de l'API publique — un déploiement avec un vrai domaine
// par client devra faire pointer /sitemap.xml et /robots.txt de ce domaine vers ces routes (rewrite
// côté hébergement/reverse-proxy, hors du code de ce socle).
public static class SeoEndpoints
{
    public static void MapEndpoints(WebApplication app)
    {
        app.MapGet("/api/t/{clientSiteId:guid}/sitemap.xml", async (Guid clientSiteId, AppDbContext db, ModuleRegistry registry, IConfiguration config) =>
        {
            var site = await db.ClientSites.FindAsync(clientSiteId);
            if (site is null) return Results.NotFound();

            var content = await db.SiteContents.FirstOrDefaultAsync(c => c.ClientSiteId == clientSiteId);
            var frontendBaseUrl = (config["Cors:AllowedOrigin"] ?? "http://localhost:5173").TrimEnd('/');
            var siteBaseUrl = $"{frontendBaseUrl}/t/{clientSiteId}";

            var urls = new List<string> { siteBaseUrl };

            if (await registry.IsEnabledAsync(clientSiteId, "catalogue"))
            {
                urls.Add($"{siteBaseUrl}/boutique");

                // Fiche produit dédiée : exclusive au template Charis (voir docs/10-templates.md),
                // Hestia/Helios n'ont qu'une modale, rien à indexer séparément pour eux.
                if (site.TemplateId == "charis")
                {
                    var productIds = await db.Products
                        .Where(p => p.ClientSiteId == clientSiteId)
                        .Select(p => p.Id)
                        .ToListAsync();
                    urls.AddRange(productIds.Select(id => $"{siteBaseUrl}/produits/{id}"));
                }
            }

            if (await registry.IsEnabledAsync(clientSiteId, "blog"))
            {
                var slugs = await db.BlogPosts
                    .Where(p => p.ClientSiteId == clientSiteId && p.PublishedAt != null)
                    .Select(p => p.Slug)
                    .ToListAsync();
                urls.AddRange(slugs.Select(slug => $"{siteBaseUrl}/blog/{slug}"));
            }

            if (await registry.IsEnabledAsync(clientSiteId, "pages"))
            {
                var slugs = await db.CustomPages
                    .Where(p => p.ClientSiteId == clientSiteId && p.PublishedAt != null)
                    .Select(p => p.Slug)
                    .ToListAsync();
                urls.AddRange(slugs.Select(slug => $"{siteBaseUrl}/pages/{slug}"));
            }

            // Pages légales — seulement celles réellement renseignées (voir SiteContent.cs, core, pas
            // un module), inutile de référencer une page "pas encore renseignée".
            if (content is not null)
            {
                if (content.CgvContent.Trim().Length > 0) urls.Add($"{siteBaseUrl}/cgv");
                if (content.LegalNoticeContent.Trim().Length > 0) urls.Add($"{siteBaseUrl}/mentions-legales");
                if (content.PrivacyPolicyContent.Trim().Length > 0) urls.Add($"{siteBaseUrl}/confidentialite");
            }

            var xml = new StringBuilder();
            xml.Append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
            xml.Append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");
            foreach (var url in urls)
            {
                xml.Append($"  <url><loc>{System.Security.SecurityElement.Escape(url)}</loc></url>\n");
            }
            xml.Append("</urlset>\n");

            return Results.Text(xml.ToString(), "application/xml");
        });

        app.MapGet("/api/t/{clientSiteId:guid}/robots.txt", async (Guid clientSiteId, AppDbContext db, IConfiguration config) =>
        {
            var exists = await db.ClientSites.AnyAsync(c => c.Id == clientSiteId);
            if (!exists) return Results.NotFound();

            var frontendBaseUrl = (config["Cors:AllowedOrigin"] ?? "http://localhost:5173").TrimEnd('/');
            var text = $"User-agent: *\nAllow: /\nSitemap: {frontendBaseUrl}/api/t/{clientSiteId}/sitemap.xml\n";
            return Results.Text(text, "text/plain");
        });
    }
}
