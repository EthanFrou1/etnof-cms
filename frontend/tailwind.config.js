/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    // Les composants de modules vivent hors de /frontend, voir docs/02-architecture-modules.md
    "../modules/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Charte graphique etnof-web, voir docs/09-charte-graphique.md.
      // Thème par défaut du starter-kit — personnalisable par client, la structure (radius,
      // typo, espacement) doit rester la même.
      colors: {
        navy: "#0F172A",
        "green-accent": "#22C55E",
        "gray-text": "#64748B",
        "border-subtle": "#E2E8F0",
        "brand-start": "#1E3A8A",
        "brand-mid": "#2563EB",
        "brand-end": "#84CC16",
        "bg-page-start": "#F8FAFC",
        "bg-page-end": "#ECFDF5",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #1E3A8A, #2563EB 50%, #84CC16)",
        "page-gradient": "linear-gradient(180deg, #F8FAFC, #ECFDF5)",
      },
      borderRadius: {
        pill: "999px",
        card: "20px",
        button: "12px",
      },
      boxShadow: {
        soft: "0 4px 20px rgba(15, 23, 42, 0.06)",
        card: "0 2px 12px rgba(15, 23, 42, 0.05)",
      },
      fontFamily: {
        sans: ["InterVariable", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
