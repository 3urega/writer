"use client";

import type { DraftRecord } from "@/lib/storage/draftStore";

type RestoreDraftDialogProps = {
  draft: DraftRecord;
  onRestore: () => void;
  onDiscard: () => void;
};

/**
 * Recuperación tras recarga: borrador distinto del texto de la versión cargada.
 */
export function RestoreDraftDialog({
  draft,
  onRestore,
  onDiscard,
}: RestoreDraftDialogProps) {
  const when = new Date(draft.updatedAt);
  const timeLabel = Number.isNaN(when.getTime())
    ? ""
    : when.toLocaleString("es-ES", {
        timeZone: "UTC",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="restore-draft-title"
    >
      <div className="max-w-md rounded-xl border border-cf-border bg-cf-surface p-5 shadow-xl">
        <h2
          id="restore-draft-title"
          className="text-base font-semibold text-cf-text"
        >
          Tienes un borrador sin guardar
        </h2>
        <p className="mt-2 text-sm text-cf-text-muted">
          Hay texto recuperado en este dispositivo{timeLabel ? ` (último autoguardado: ${timeLabel} UTC)` : ""}.
          Puedes restaurarlo en el editor o descartarlo y quedarte con la versión cargada del proyecto.
        </p>
        <p className="mt-2 text-xs text-cf-text-muted">
          {draft.content.length.toLocaleString("es-ES")} caracteres
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRestore}
            className="rounded-lg bg-cf-primary px-4 py-2 text-sm font-medium text-white"
          >
            Restaurar borrador
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="rounded-lg border border-cf-border px-4 py-2 text-sm text-cf-text-muted hover:bg-cf-surface-hover"
          >
            Descartar
          </button>
        </div>
      </div>
    </div>
  );
}
