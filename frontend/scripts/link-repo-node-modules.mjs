// Crée un lien (junction sous Windows, symlink ailleurs) de <racine du repo>/node_modules
// vers frontend/node_modules. Nécessaire pour que les fichiers de /modules (hors de /frontend,
// voir docs/02-architecture-modules.md) résolvent React depuis la même install que le reste
// de l'app, au lieu de remonter l'arborescence et de tomber sur un autre node_modules
// (ce qui provoquerait une double instance de React et des erreurs de hooks).
import { existsSync, symlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(__dirname, "../node_modules");
const linkPath = path.resolve(__dirname, "../../node_modules");

if (!existsSync(linkPath)) {
  symlinkSync(target, linkPath, process.platform === "win32" ? "junction" : "dir");
  console.log(`Lien créé : ${linkPath} -> ${target}`);
}
