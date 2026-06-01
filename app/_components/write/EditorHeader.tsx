"use client";

import { DraftStatusBadge } from "./DraftStatusBadge";

export type ChapterOption = { id: string; label: string };

type EditorHeaderProps = {
  projectName: string;
  chapterOptions: ChapterOption[];
  activeChapterId: string;
  onChapterChange: (chapterId: string) => void;
  chapterSubtitle: string;
  variationLabel: string;
  isDirty: boolean;
  lastLocalSaveAt: string | null;
  remoteLoading: boolean;
  remoteProjectIdHasRemote: boolean;
  syncing: boolean;
  syncError: string | null;
  onCreateVersion: () => void;
  onImprove: () => void;
  onSync: () => void;
  onResetLocal: () => void;
  focusMode: boolean;
  onToggleFocus: () => void;
  onOpenTools: () => void;
};

function formatShortTime(iso: string | null): string {
  if (!iso) return "";
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "";
  return t.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Cabecera del espacio de escritura (mockup: proyecto, capítulo, estados, acciones).
 */
export function EditorHeader({
  projectName,
  chapterOptions,
  activeChapterId,
  onChapterChange,
  chapterSubtitle,
  variationLabel,
  isDirty,
  lastLocalSaveAt,
  remoteLoading,
  remoteProjectIdHasRemote,
  syncing,
  syncError,
  onCreateVersion,
  onImprove,
  onSync,
  onResetLocal,
  focusMode,
  onToggleFocus,
  onOpenTools,
}: EditorHeaderProps) {
  const syncFailed = Boolean(syncError);
  const serverOk =
    remoteProjectIdHasRemote && !remoteLoading && !syncFailed && !syncing;

  return (
    <header className="flex flex-col gap-3 border-b border-cf-border pb-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-[10rem] flex-1 rounded-lg border border-cf-border bg-cf-bg/50 px-2 py-1.5">
              <label className="block text-[10px] font-medium uppercase tracking-wide text-cf-text-muted">
                Libro
              </label>
              <p className="truncate text-sm font-semibold text-cf-text">{projectName}</p>
            </div>
            {chapterOptions.length > 1 ? (
              <div className="min-w-[12rem] flex-1">
                <label className="block text-[10px] font-medium uppercase tracking-wide text-cf-text-muted">
                  Capítulo
                </label>
                <select
                  value={activeChapterId}
                  onChange={(e) => onChapterChange(e.target.value)}
                  className="mt-0.5 w-full rounded-lg border border-cf-border bg-cf-bg px-2 py-1.5 text-sm text-cf-text"
                >
                  {chapterOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
          <p className="text-sm text-cf-text">
            <span className="text-cf-text-muted">{chapterSubtitle}</span>
            <span className="text-cf-text-muted"> · </span>
            <span className="text-cf-primary">{variationLabel}</span>
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <DraftStatusBadge isDirty={isDirty} />
            {isDirty ? (
              <button
                type="button"
                onClick={onCreateVersion}
                className="rounded-lg bg-cf-primary px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-95"
                title="Crea una entrada nueva en el historial con el texto actual (Ctrl+S o ⌘S)"
              >
                Guardar
              </button>
            ) : null}
            {lastLocalSaveAt ?
              <span
                className={`rounded-full border px-2 py-0.5 ${
                  isDirty
                    ? "border-cf-border bg-cf-bg/70 text-cf-text-muted"
                    : "border-cf-success/30 bg-cf-success/10 text-cf-success"
                }`}
                title={
                  isDirty
                    ? "Copia de seguridad solo en este navegador. No entra en el historial del libro hasta que pulses Guardar."
                    : undefined
                }
              >
                {isDirty ? "Rescate en navegador" : "Autoguardado local"} ·{" "}
                {formatShortTime(lastLocalSaveAt)}
              </span>
            : null}
            {remoteLoading ?
              <span className="text-cf-text-muted">Conectando…</span>
            : syncFailed ?
              <span className="rounded-full border border-red-500/40 bg-red-950/30 px-2 py-0.5 text-red-200">
                Error de sincronización
              </span>
            : syncing ?
              <span className="text-cf-warning">Guardando en servidor…</span>
            : serverOk ?
              <span className="rounded-full border border-cf-success/30 bg-cf-success/10 px-2 py-0.5 text-cf-success">
                Sincronizado
              </span>
            : (
              <span className="text-cf-text-muted">Sin conexión al servidor</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <button
            type="button"
            onClick={onOpenTools}
            className="rounded-lg border border-cf-border px-3 py-2 text-sm text-cf-text-muted hover:bg-cf-surface-hover lg:hidden"
          >
            Herramientas
          </button>
          <button
            type="button"
            onClick={onToggleFocus}
            className={`rounded-lg border px-3 py-2 text-sm ${
              focusMode
                ? "border-cf-primary bg-cf-primary-soft text-cf-primary"
                : "border-cf-border text-cf-text-muted hover:bg-cf-surface-hover"
            }`}
            title="Ocultar paneles laterales"
          >
            Modo foco
          </button>
          {!isDirty ? (
            <button
              type="button"
              onClick={onCreateVersion}
              className="rounded-lg bg-cf-text px-3 py-2 text-sm font-medium text-cf-bg dark:bg-cf-primary dark:text-white"
              title="Crea un hito en el historial con el texto actual (aunque no hayas cambiado nada)"
            >
              Nueva versión (mismo texto)
            </button>
          ) : null}
          <button
            type="button"
            onClick={onImprove}
            className="rounded-lg border border-cf-primary/50 bg-cf-primary-soft px-3 py-2 text-sm font-medium text-cf-primary"
          >
            Mejorar con IA
          </button>
          <button
            type="button"
            onClick={onSync}
            disabled={!remoteProjectIdHasRemote || syncing}
            className="rounded-lg border border-cf-border px-3 py-2 text-sm text-cf-text disabled:opacity-50"
          >
            Sincronizar
          </button>
          <button
            type="button"
            onClick={onResetLocal}
            disabled={remoteLoading}
            className="rounded-lg border border-cf-border px-2 py-2 text-sm text-cf-text-muted hover:text-cf-text disabled:opacity-50"
            title="Reiniciar"
          >
            ⋯
          </button>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full border border-cf-border bg-cf-surface text-xs text-cf-text-muted"
            title="Perfil"
          >
            U
          </div>
        </div>
      </div>
    </header>
  );
}
