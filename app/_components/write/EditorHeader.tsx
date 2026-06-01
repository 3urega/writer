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
  onOpenTools: () => void;
  onOpenChapters: () => void;
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
 * Cabecera del espacio de escritura: libro, capítulo activo y estado del borrador.
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
  onOpenTools,
  onOpenChapters,
}: EditorHeaderProps) {
  const syncFailed = Boolean(syncError);
  const serverOk =
    remoteProjectIdHasRemote && !remoteLoading && !syncFailed && !syncing;

  return (
    <header className="flex flex-col gap-3 border-b border-cf-border pb-3">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[10rem] flex-1 rounded-lg border border-cf-border bg-cf-bg/50 px-2 py-1.5">
            <label className="block text-[10px] font-medium uppercase tracking-wide text-cf-text-muted">
              Libro
            </label>
            <p className="truncate text-sm font-semibold text-cf-text">{projectName}</p>
          </div>
          <div className="min-w-[12rem] flex-1 rounded-lg border border-cf-border bg-cf-bg/50 px-2 py-1.5">
            <label className="block text-[10px] font-medium uppercase tracking-wide text-cf-text-muted">
              Capítulo
            </label>
              {chapterOptions.length > 1 ? (
                <div className="mt-0.5 flex min-w-0 items-center gap-2">
                  <select
                    value={activeChapterId}
                    onChange={(e) => onChapterChange(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-cf-border bg-cf-bg px-2 py-1.5 text-sm text-cf-text"
                  >
                    {chapterOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={onOpenChapters}
                    className="shrink-0 rounded-md border border-cf-border px-2 py-1 text-[10px] font-medium text-cf-text-muted hover:bg-cf-surface-hover hover:text-cf-text"
                    title="Abrir lista de capítulos"
                  >
                    Ver capítulos
                  </button>
                </div>
              ) : (
              <div className="mt-0.5 flex min-w-0 items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-cf-text">
                  {chapterSubtitle || "Capítulo 1"}
                </p>
                <button
                  type="button"
                  onClick={onOpenChapters}
                  className="shrink-0 rounded-md border border-cf-border px-2 py-1 text-[10px] font-medium text-cf-text-muted hover:bg-cf-surface-hover hover:text-cf-text"
                >
                  Ver capítulos
                </button>
              </div>
            )}
          </div>
        </div>
        <p className="text-sm text-cf-text">
          <span className="text-cf-text-muted">Línea narrativa</span>
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
          <button
            type="button"
            onClick={onOpenTools}
            className="rounded-lg border border-cf-border px-3 py-1.5 text-xs text-cf-text-muted hover:bg-cf-surface-hover lg:hidden"
          >
            Herramientas
          </button>
        </div>
      </div>
    </header>
  );
}
