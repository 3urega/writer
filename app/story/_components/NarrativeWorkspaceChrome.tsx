"use client";

import Link from "next/link";

export type NarrativeDraftStatus = "idle" | "saving" | "saved" | "error";

export function NarrativeWorkspaceChrome({
  bookTitle,
  chapterTitle,
  referencesActive,
  onReferencesActiveChange,
  agentMode,
  onAgentModeChange,
  onOpenContext,
  contextPanelHidden,
  draftStatus,
  onSaveMoment,
}: {
  bookTitle: string;
  chapterTitle: string;
  referencesActive: boolean;
  onReferencesActiveChange: (v: boolean) => void;
  agentMode: string;
  onAgentModeChange: (v: string) => void;
  onOpenContext: () => void;
  contextPanelHidden: boolean;
  draftStatus: NarrativeDraftStatus;
  onSaveMoment: () => void;
}) {
  return (
    <>
      <header
        className={[
          "pointer-events-none sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3",
          "border-b border-nm-border/40 bg-nm-bg-deep/75 px-3 py-3 backdrop-blur-md sm:px-4",
        ].join(" ")}
      >
        <div className="pointer-events-auto min-w-0">
          <p className="truncate text-xs text-nm-text-muted">{bookTitle}</p>
          <p className="truncate text-sm font-semibold tracking-tight text-nm-text sm:text-base">
            {chapterTitle}
          </p>
        </div>
        <div className="pointer-events-auto flex flex-wrap items-center gap-2 sm:gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-nm-text-secondary">
            <input
              type="checkbox"
              checked={referencesActive}
              onChange={(e) => onReferencesActiveChange(e.target.checked)}
              className="size-3.5 rounded border-nm-border text-nm-primary focus:ring-nm-primary"
            />
            Referencias activas
          </label>
          <select
            value={agentMode}
            onChange={(e) => onAgentModeChange(e.target.value)}
            className={[
              "rounded-full border border-nm-border bg-nm-surface/50 px-3 py-1.5 text-xs text-nm-text",
              "focus:border-nm-primary focus:outline-none focus:ring-1 focus:ring-nm-primary/30",
            ].join(" ")}
            aria-label="Modo agente"
          >
            <option value="collab">Colaborativo</option>
            <option value="gentle">Sugerencias suaves</option>
            <option value="bold">Atrevido</option>
          </select>
          {contextPanelHidden ?
            <button
              type="button"
              onClick={onOpenContext}
              className="rounded-full border border-nm-border px-3 py-1.5 text-xs text-nm-text-secondary hover:bg-nm-surface-glass"
            >
              Contexto
            </button>
          : null}
          <button
            type="button"
            onClick={onSaveMoment}
            className="rounded-full border border-nm-primary/50 bg-nm-primary-soft px-3 py-1.5 text-xs font-medium text-nm-text"
          >
            Guardar momento
          </button>
          <span
            className="text-[10px] text-nm-text-muted sm:text-xs"
            aria-live="polite"
          >
            {draftStatus === "saving" ?
              "Guardando…"
            : draftStatus === "saved" ?
              "Guardado"
            : draftStatus === "error" ?
              "No se pudo guardar el borrador"
            : ""}
          </span>
        </div>
      </header>
    </>
  );
}

export function NarrativeWorkspaceNav({
  onMoments,
  onExplore,
}: {
  onMoments: () => void;
  onExplore: () => void;
}) {
  return (
    <nav
      className={[
        "flex w-full flex-row items-center justify-center gap-1 border-b border-nm-border/50",
        "bg-nm-surface/20 py-2 backdrop-blur-sm lg:h-full lg:w-[var(--nm-rail-width)] lg:flex-col lg:justify-start lg:border-b-0 lg:border-r lg:py-4",
      ].join(" ")}
      aria-label="Navegación narrativa"
    >
      <Link
        href="/"
        className={[
          "flex size-10 items-center justify-center rounded-xl text-nm-text-muted transition-colors hover:bg-nm-surface-glass hover:text-nm-text",
          "lg:size-11",
        ].join(" ")}
        title="Inicio"
      >
        <span className="text-lg" aria-hidden>
          ⌂
        </span>
        <span className="sr-only">Inicio</span>
      </Link>
      <button
        type="button"
        onClick={onMoments}
        className={[
          "flex size-10 items-center justify-center rounded-xl text-nm-text-muted transition-colors hover:bg-nm-surface-glass hover:text-nm-text",
          "lg:size-11",
        ].join(" ")}
        title="Momentos guardados"
      >
        <span className="text-lg" aria-hidden>
          ◎
        </span>
        <span className="sr-only">Momentos guardados</span>
      </button>
      <button
        type="button"
        onClick={onExplore}
        className={[
          "flex size-10 items-center justify-center rounded-xl text-nm-text-muted transition-colors hover:bg-nm-surface-glass hover:text-nm-text",
          "lg:size-11",
        ].join(" ")}
        title="Explorar"
      >
        <span className="text-lg" aria-hidden>
          ◇
        </span>
        <span className="sr-only">Explorar direcciones</span>
      </button>
    </nav>
  );
}
