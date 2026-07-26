import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import { adminFetch } from "../../hooks/useAdminSession";

type ContactMessage = {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
};

type MessagesSectionProps = {
  clientSiteId: string;
  password: string;
};

export default function MessagesSection({ clientSiteId, password }: MessagesSectionProps) {
  const [messages, setMessages] = useState<ContactMessage[] | null>(null);

  useEffect(() => {
    adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/messages`, password)
      .then((res) => res.json())
      .then(setMessages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold text-navy">Messages</h1>

      {!messages ? (
        <p className="text-gray-text">Chargement…</p>
      ) : messages.length === 0 ? (
        <section className="rounded-card bg-white p-8 shadow-card">
          <p className="text-gray-text">
            Aucun message pour l'instant — les envois depuis le formulaire de contact du site
            apparaîtront ici.
          </p>
        </section>
      ) : (
        <div className="flex flex-col gap-3">
          {messages.map((m) => (
            <article key={m.id} className="rounded-card bg-white p-6 shadow-card">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold text-navy">{m.name}</span>
                <span className="text-xs text-gray-text">
                  {new Date(m.createdAt).toLocaleString("fr-FR")}
                </span>
              </div>
              <a href={`mailto:${m.email}`} className="text-sm text-brand-mid hover:underline">
                {m.email}
              </a>
              <p className="mt-3 leading-relaxed text-gray-text">{m.message}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
