"use client";

import type { Fragment } from "@/lib/domain/types";

type FloatingSelectionToolbarProps = {
  fragment: Fragment | null;
  /** Abre pestaña Mejorar y opcionalmente rellena mensaje */
  onImprove: () => void;
  onRewrite: () => void;
  onChangeTone: () => void;
  onCompare: () => void;
  onNewVariation: () => void;
};

const btn =
  "rounded-md border border-cf-border bg-cf-surface px-2.5 py-1.5 text-xs font-medium text-cf-text hover:bg-cf-surface-hover";

/**
 * Acciones sobre el texto seleccionado (barra contextual).
 */
export function FloatingSelectionToolbar({
  fragment,
  onImprove,
  onRewrite,
  onChangeTone,
  onCompare,
  onNewVariation,
}: FloatingSelectionToolbarProps) {
  if (!fragment || fragment.end <= fragment.start) return null;
  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-xl border border-cf-border bg-cf-surface/95 px-3 py-2 shadow-lg backdrop-blur-sm"
      role="toolbar"
      aria-label="Acciones de selección"
    >
      <span className="text-[10px] text-cf-text-muted">
        {fragment.text.length} caracteres
      </span>
      <button type="button" className={btn} onClick={onImprove}>
        Mejorar
      </button>
      <button type="button" className={btn} onClick={onRewrite}>
        Reescribir
      </button>
      <button type="button" className={btn} onClick={onChangeTone}>
        Cambiar tono
      </button>
      <button type="button" className={btn} onClick={onCompare}>
        Comparar
      </button>
      <button type="button" className={btn} onClick={onNewVariation}>
        Nueva variación
      </button>
    </div>
  );
}
