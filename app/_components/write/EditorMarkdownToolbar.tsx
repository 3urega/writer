"use client";

type EditorMarkdownToolbarProps = {
  onInsert: (before: string, after: string) => void;
};

export function EditorMarkdownToolbar({ onInsert }: EditorMarkdownToolbarProps) {
  const btn =
    "rounded border border-cf-border bg-cf-bg/60 px-2 py-1 text-xs text-cf-text-muted hover:border-cf-primary/40 hover:text-cf-primary";
  return (
    <div
      className="flex flex-wrap gap-1 border-b border-cf-border pb-2"
      role="toolbar"
      aria-label="Formato de texto"
    >
      <button type="button" className={btn} onClick={() => onInsert("## ", "")}>
        H2
      </button>
      <button type="button" className={btn} onClick={() => onInsert("**", "**")}>
        Negrita
      </button>
      <button type="button" className={btn} onClick={() => onInsert("*", "*")}>
        Cursiva
      </button>
      <button type="button" className={btn} onClick={() => onInsert("- ", "")}>
        Lista
      </button>
      <button type="button" className={btn} onClick={() => onInsert("> ", "")}>
        Cita
      </button>
      <button type="button" className={btn} onClick={() => onInsert("\n\n", "")}>
        Párrafo
      </button>
    </div>
  );
}
