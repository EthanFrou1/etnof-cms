import { useEffect, type ReactNode } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  // Pour un champ court (ex. SiteContent.Description) : pas de hauteur mini/maxi imposée, l'éditeur
  // suit juste la taille de son contenu au lieu du grand cadre à défilement interne utilisé pour du
  // contenu long (article de blog, page, CGV).
  compact?: boolean;
};

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`rounded-button px-2.5 py-1.5 text-sm font-semibold transition-colors ${
        active ? "bg-brand-mid/10 text-brand-mid" : "text-gray-text hover:bg-bg-page-start"
      }`}
    >
      {children}
    </button>
  );
}

// Éditeur d'article de blog — TipTap (StarterKit : gras/italique/titres/listes/lien, pas d'images
// inline pour rester simple, voir échange avec Ethan avant d'ajouter la dépendance). Le contenu est
// stocké/renvoyé en HTML (editor.getHTML()) — modules/blog/frontend/BlogPostPage.tsx le rend tel
// quel côté public, avec un repli texte brut pour les articles écrits avant ce changement.
export default function RichTextEditor({ value, onChange, compact = false }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // `content` de useEditor ne sert qu'à l'initialisation — un changement de `value` venu de
  // l'extérieur (ex. bouton "Utiliser une suggestion" d'EstablishmentSection.tsx, ou un rechargement
  // de `content` après enregistrement) ne se répercute pas tout seul dans l'éditeur sans ce
  // useEffect. Comparé à editor.getHTML() pour ne pas interrompre la frappe normale : onUpdate
  // ci-dessus est la source de vérité pendant que l'utilisateur tape, ce useEffect ne doit resynchroniser
  // que lorsque `value` a changé pour une autre raison.
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL du lien :", previousUrl ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  };

  return (
    <div className="rounded-button border border-border-subtle bg-white focus-within:border-brand-mid focus-within:outline-none focus-within:ring-2 focus-within:ring-brand-mid/20">
      <div className="flex flex-wrap gap-1 border-b border-border-subtle p-2">
        <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} label="Gras">
          <strong>G</strong>
        </ToolbarButton>
        <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} label="Italique">
          <em>I</em>
        </ToolbarButton>
        {/* Titres/listes/citation réservés au contenu long (article, page, CGV) — pas de sens pour un
            champ court comme un sous-titre, voir la note sur `compact` plus haut. */}
        {!compact && (
          <>
            <ToolbarButton
              active={editor.isActive("heading", { level: 2 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              label="Titre"
            >
              H2
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive("heading", { level: 3 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              label="Sous-titre"
            >
              H3
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive("bulletList")}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              label="Liste à puces"
            >
              •—
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive("orderedList")}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              label="Liste numérotée"
            >
              1.
            </ToolbarButton>
            <ToolbarButton active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} label="Citation">
              "
            </ToolbarButton>
          </>
        )}
        <ToolbarButton active={editor.isActive("link")} onClick={setLink} label="Lien">
          🔗
        </ToolbarButton>
      </div>
      <EditorContent
        editor={editor}
        className={`px-3 py-2 text-navy [&_.ProseMirror]:outline-none [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-bold [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_a]:text-brand-mid [&_.ProseMirror_a]:underline [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-border-subtle [&_.ProseMirror_blockquote]:pl-3 [&_.ProseMirror_blockquote]:text-gray-text ${
          compact ? "[&_.ProseMirror]:min-h-[60px]" : "max-h-[480px] min-h-[280px] overflow-y-auto [&_.ProseMirror]:min-h-[260px]"
        }`}
      />
    </div>
  );
}
