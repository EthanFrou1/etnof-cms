import { useEffect, useRef, useState } from "react";

// Révèle un bloc (fondu + léger décalage vers le haut, voir docs/10-templates.md) quand il entre
// dans le viewport — une seule fois (pas de réanimation au scroll retour, `observer.disconnect()`
// dès le premier déclenchement), via IntersectionObserver natif (aucune dépendance ajoutée).
export function useRevealOnScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respecte la préférence système "réduire les animations" : affiché directement, sans observer.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}
