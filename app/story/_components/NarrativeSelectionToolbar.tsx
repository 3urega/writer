"use client";

import { useEffect, useRef } from "react";

const ACTIONS = [
  { id: "rewrite", label: "Reescribir" },
  { id: "tension", label: "Más tensión" },
  { id: "dialogue", label: "Más diálogo" },
  { id: "expand", label: "Expandir" },
  { id: "shorten", label: "Acortar" },
  { id: "tone", label: "Cambiar tono" },
  { id: "explore", label: "Explorar alternativa" },
] as const;

export type NarrativeSelectionActionId = (typeof ACTIONS)[number]["id"];

export function NarrativeSelectionToolbar({
  open,
  anchorTop,
  onAction,
  onDismiss,
}: {
  open: boolean;
  /** px desde arriba del contenedor relativo */
  anchorTop: number;
  onAction: (id: NarrativeSelectionActionId) => void;
  onDismiss: () => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent): void => {
      const t = e.target as Node;
      if (barRef.current?.contains(t)) return;
      onDismiss();
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onDismiss();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onDismiss]);

  if (!open) return null;

  return (
    <div
      ref={barRef}
      className={[
        "absolute left-1/2 z-30 flex max-w-[95vw] -translate-x-1/2 flex-wrap items-center justify-center gap-1.5",
        "rounded-2xl border border-nm-border/80 bg-nm-surface/95 px-2 py-2 shadow-xl shadow-black/40",
        "backdrop-blur-md",
      ].join(" ")}
      style={{ top: Math.max(8, anchorTop) }}
      role="toolbar"
      aria-label="Acciones sobre la selección"
    >
      {ACTIONS.map((a) => (
        <button
          key={a.id}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onAction(a.id)}
          className={[
            "shrink-0 rounded-full border border-nm-border/70 bg-nm-bg/50 px-2.5 py-1 text-[11px] text-nm-text-secondary",
            "transition-colors hover:border-nm-primary/45 hover:text-nm-text sm:text-xs",
          ].join(" ")}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}
