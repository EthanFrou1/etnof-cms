import { useState, type FormEvent } from "react";

type ContactSectionProps = {
  apiBaseUrl: string;
  clientSiteId: string;
};

type FormState = {
  name: string;
  email: string;
  message: string;
};

const initialState: FormState = { name: "", email: "", message: "" };

const inputClass =
  "rounded-button border border-border-subtle bg-white px-4 py-2.5 text-navy placeholder:text-gray-text/60 focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20";

export default function ContactSection({ apiBaseUrl, clientSiteId }: ContactSectionProps) {
  const [form, setForm] = useState<FormState>(initialState);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("sending");

    try {
      const res = await fetch(`${apiBaseUrl}/api/t/${clientSiteId}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Erreur d'envoi");

      setForm(initialState);
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  return (
    <section className="rounded-card bg-white p-8 shadow-card">
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-green-accent">
        Contact
      </span>
      <h2 className="mb-5 mt-1 text-2xl font-extrabold text-navy">Une question ?</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          className={inputClass}
          placeholder="Nom"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          type="email"
          className={inputClass}
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <textarea
          className={inputClass}
          placeholder="Message"
          rows={4}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          required
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Envoyer
        </button>
        {status === "sent" && <p className="text-green-accent">Message envoyé !</p>}
        {status === "error" && <p className="text-red-500">Erreur, réessaie.</p>}
      </form>
    </section>
  );
}
