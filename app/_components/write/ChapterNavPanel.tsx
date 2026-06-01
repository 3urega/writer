"use client";

export type ChapterNavItem = {
  id: string;
  label: string;
};

type ChapterNavPanelProps = {
  chapters: ChapterNavItem[];
  activeChapterId: string;
  onSelectChapter: (chapterId: string) => void;
  onInsertChapterAtIndex: (index: number) => void;
};

const insertBtn =
  "flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-cf-border px-2 py-1.5 text-[10px] font-medium text-cf-text-muted hover:border-cf-primary/40 hover:bg-cf-primary-soft/30 hover:text-cf-primary";

const insertBetweenBtn =
  "mx-1 flex h-6 w-full items-center justify-center rounded-md border border-dashed border-cf-border/80 text-xs leading-none text-cf-text-muted hover:border-cf-primary/40 hover:bg-cf-primary-soft/30 hover:text-cf-primary";

/**
 * Lista de capítulos del libro; navegación e inserción al inicio, entre o al final.
 */
export function ChapterNavPanel({
  chapters,
  activeChapterId,
  onSelectChapter,
  onInsertChapterAtIndex,
}: ChapterNavPanelProps) {
  if (chapters.length === 0) {
    return (
      <div className="space-y-2">
        <p className="rounded-lg border border-dashed border-cf-border p-3 text-sm text-cf-text-muted">
          No hay capítulos en este libro.
        </p>
        <button
          type="button"
          className={insertBtn}
          onClick={() => onInsertChapterAtIndex(0)}
        >
          + Añadir capítulo
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-cf-text-muted">
        {chapters.length === 1 ?
          "1 capítulo · el número es orientativo"
        : `${chapters.length} capítulos · el número es orientativo`}
      </p>
      <button
        type="button"
        className={insertBtn}
        onClick={() => onInsertChapterAtIndex(0)}
      >
        + Añadir al inicio
      </button>
      <ul
        className="max-h-[min(40vh,320px)] space-y-0.5 overflow-y-auto text-sm"
        aria-label="Capítulos del libro"
      >
        {chapters.map((ch, index) => {
          const active = ch.id === activeChapterId;
          return (
            <li key={ch.id} className="space-y-0.5">
              <button
                type="button"
                onClick={() => onSelectChapter(ch.id)}
                aria-current={active ? "true" : undefined}
                className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                  active
                    ? "bg-cf-primary-soft text-cf-text ring-1 ring-cf-primary/40"
                    : "text-cf-text-muted hover:bg-cf-surface-hover hover:text-cf-text"
                }`}
              >
                <span className={`block font-medium ${active ? "text-cf-text" : ""}`}>
                  {ch.label}
                </span>
                {active ?
                  <span className="mt-0.5 block text-[10px] text-cf-primary">
                    Editando ahora
                  </span>
                : null}
              </button>
              <button
                type="button"
                className={insertBetweenBtn}
                onClick={() => onInsertChapterAtIndex(index + 1)}
                title="Insertar capítulo aquí"
                aria-label={`Insertar capítulo después de ${ch.label}`}
              >
                +
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        className={insertBtn}
        onClick={() => onInsertChapterAtIndex(chapters.length)}
      >
        + Añadir al final
      </button>
    </div>
  );
}
