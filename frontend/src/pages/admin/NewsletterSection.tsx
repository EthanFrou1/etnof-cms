import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import { adminFetch } from "../../hooks/useAdminSession";

type Subscriber = {
  id: string;
  email: string;
  createdAt: string;
};

type NewsletterSectionProps = {
  clientSiteId: string;
  password: string;
};

export default function NewsletterSection({ clientSiteId, password }: NewsletterSectionProps) {
  const [subscribers, setSubscribers] = useState<Subscriber[] | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/newsletter/subscribers`, password)
      .then((res) => res.json())
      .then(setSubscribers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Téléchargement en JS (pas un simple <a href>) : l'auth se fait par en-tête X-Admin-Password,
  // pas par cookie, donc une navigation directe vers l'URL ne serait pas authentifiée.
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/newsletter/subscribers/export`, password);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "newsletter.csv";
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-navy">Newsletter</h1>
        {subscribers && subscribers.length > 0 && (
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {exporting ? "Export…" : "Exporter en CSV"}
          </button>
        )}
      </div>

      {!subscribers ? (
        <p className="text-gray-text">Chargement…</p>
      ) : subscribers.length === 0 ? (
        <section className="rounded-card bg-white p-8 shadow-card">
          <p className="text-gray-text">
            Aucun inscrit pour l'instant — les inscriptions depuis le formulaire du site apparaîtront ici.
          </p>
        </section>
      ) : (
        <section className="rounded-card bg-white shadow-card">
          <div className="p-6 pb-0 text-sm text-gray-text">
            {subscribers.length} inscrit{subscribers.length > 1 ? "s" : ""}
          </div>
          <div className="flex flex-col gap-3 p-6">
            {subscribers.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-button bg-bg-page-start/60 p-4"
              >
                <span className="font-medium text-navy">{s.email}</span>
                <span className="shrink-0 text-xs text-gray-text">
                  {new Date(s.createdAt).toLocaleDateString("fr-FR")}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
