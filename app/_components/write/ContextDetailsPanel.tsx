"use client";

import type { Fragment } from "@/lib/domain/types";

type ContextDetailsPanelProps = {
  fragment: Fragment | null;
  activeDocsSummary: string;
  onOpenKnowledgeTab: () => void;
  chapterId: string;
  chapterTitle: string;
  onChapterTitleBlur: (next: string) => void;
};

export function ContextDetailsPanel({
  fragment,
  activeDocsSummary,
  onOpenKnowledgeTab,
  chapterId,
  chapterTitle,
  onChapterTitleBlur,
}: ContextDetailsPanelProps) {
  return (
    <div className="space-y-4 text-sm">
      <div>
        <label className="text-xs font-semibold text-cf-text-muted">
          Título del capítulo
        </label>
        <input
          type="text"
          key={chapterId}
          defaultValue={chapterTitle}
          onBlur={(e) => onChapterTitleBlur(e.target.value)}
          placeholder="Ej. El umbral"
          className="mt-1 w-full rounded-lg border border-cf-border bg-cf-bg px-2 py-1.5 text-sm text-cf-text"
        />
        <p className="mt-1 text-[10px] text-cf-text-muted">
          Se guarda con el proyecto al sincronizar.
        </p>
      </div>
      <div>
        <h3 className="text-xs font-semibold text-cf-text-muted">
          Fragmento seleccionado
        </h3>
        {fragment == null || fragment.end <= fragment.start ? (
          <p className="mt-1 text-xs text-cf-text-muted">
            Selecciona texto en el editor para verlo aquí.
          </p>
        ) : (
          <div className="mt-2 rounded-lg border border-cf-border bg-cf-bg/50 p-2 text-xs">
            <p className="text-[10px] text-cf-text-muted">
              {fragment.start}–{fragment.end} · {fragment.text.length} caracteres
            </p>
            <p className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap break-words text-cf-text">
              {fragment.text}
            </p>
          </div>
        )}
      </div>
      <div>
        <h3 className="text-xs font-semibold text-cf-text-muted">
          Fuentes para la IA
        </h3>
        <p className="mt-1 text-xs text-cf-text-muted">{activeDocsSummary}</p>
        <button
          type="button"
          onClick={onOpenKnowledgeTab}
          className="mt-2 text-xs font-medium text-cf-primary underline"
        >
          Gestionar en Conocimiento
        </button>
      </div>
      <div className="rounded-lg border border-cf-border/60 bg-cf-bg/40 p-2 text-[10px] leading-relaxed text-cf-text-muted">
        Lo del editor es <strong className="text-cf-text">borrador</strong> hasta pulsar{" "}
        <strong className="text-cf-text">Guardar</strong>. El rescate en navegador no sustituye a
        Guardar.
      </div>
    </div>
  );
}
