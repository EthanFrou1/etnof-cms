import { useState } from "react";
import { MODULE_IMAGES } from "../../moduleIcons";

type ModuleThumbnailProps = {
  name: string;
  displayName: string;
  className?: string;
};

// Miniature réutilisée partout où un module est listé sans la grande card complète de
// ModulesSection.tsx (PricingSection.tsx, SitesSection.tsx) — même repli dégradé + initiale tant
// qu'un fichier n'existe pas dans frontend/public/module-icons/, voir docs/11-images-modules.md.
export default function ModuleThumbnail({ name, displayName, className = "h-12 w-12" }: ModuleThumbnailProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const imageSrc = MODULE_IMAGES[name];

  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-button bg-brand-gradient ${className}`}>
      {imageSrc && !imgFailed ? (
        <img src={imageSrc} alt="" onError={() => setImgFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <span className="text-lg font-black text-white/70">{displayName.charAt(0)}</span>
      )}
    </div>
  );
}
