import { useEffect } from "react";
import { useContent } from "../hooks/useContent";

type LegalNoticePageProps = {
  clientSiteId: string;
};

// Page publique des mentions légales — contenu "core" (SiteContent.LegalNoticeContent), pas un
// module, même raison et même structure que CgvPage.tsx.
export default function LegalNoticePage({ clientSiteId }: LegalNoticePageProps) {
  const content = useContent(clientSiteId);

  useEffect(() => {
    if (content) document.title = "Mentions légales";
  }, [content]);

  if (!content) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-gray-text">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <a href={`/t/${clientSiteId}`} className="self-start text-sm font-medium text-gray-text hover:text-navy">
          ← Retour au site
        </a>

        <article className="rounded-card bg-white p-10 shadow-card">
          <h1 className="mb-6 text-4xl font-black leading-tight text-navy">Mentions légales</h1>
          {content.legalNoticeContent.trim() ? (
            <div
              className="leading-relaxed text-gray-text [&_a]:text-brand-mid [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border-subtle [&_blockquote]:pl-3 [&_blockquote]:italic [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-navy [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-navy [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{ __html: content.legalNoticeContent }}
            />
          ) : (
            <p className="text-gray-text">Cette page n'est pas encore renseignée.</p>
          )}
        </article>
      </div>
    </div>
  );
}
