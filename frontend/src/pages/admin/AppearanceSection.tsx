import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import type { TemplateId } from "../../hooks/useTemplate";
import { adminFetch } from "../../hooks/useAdminSession";
import { TEMPLATES } from "../../templates/registry";

type AppearanceSectionProps = {
  clientSiteId: string;
  password: string;
};

export default function AppearanceSection({ clientSiteId, password }: AppearanceSectionProps) {
  const [templateId, setTemplateId] = useState<TemplateId | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/t/${clientSiteId}/template`)
      .then((res) => res.json())
      .then((data: { templateId: TemplateId }) => setTemplateId(data.templateId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = async (id: TemplateId) => {
    setSaving(true);
    await adminFetch(API_BASE_URL, `/api/t/${clientSiteId}/admin/template`, password, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId: id }),
    });
    setTemplateId(id);
    setSaving(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold text-navy">Apparence</h1>

      <section className="rounded-card bg-white p-8 shadow-card">
        <h2 className="mb-4 text-lg font-bold text-navy">Mise en page du site</h2>
        <div className="flex flex-col gap-3">
          {TEMPLATES.map((t) => (
            <label
              key={t.id}
              className="flex items-start gap-3 rounded-button border border-border-subtle p-3 has-[:checked]:border-brand-mid"
            >
              <input
                type="radio"
                name="template"
                checked={templateId === t.id}
                disabled={saving}
                onChange={() => choose(t.id)}
                className="mt-1 h-4 w-4 accent-brand-mid"
              />
              <span className="flex flex-col">
                <span className="font-semibold text-navy">{t.label}</span>
                <span className="text-sm text-gray-text">{t.description}</span>
              </span>
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
