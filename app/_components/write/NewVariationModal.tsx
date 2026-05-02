"use client";

import { useState } from "react";

type NewVariationModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, intention: string) => void;
};

function NewVariationModalForm({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (name: string, intention: string) => void;
}) {
  const [name, setName] = useState("");
  const [intention, setIntention] = useState("");

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-var-title"
    >
      <div className="w-full max-w-md rounded-xl border border-cf-border bg-cf-surface p-5 shadow-xl">
        <h2 id="new-var-title" className="text-base font-semibold text-cf-text">
          Nueva variación
        </h2>
        <p className="mt-1 text-xs text-cf-text-muted">
          Explora otra línea narrativa a partir de la <strong className="text-cf-text">versión activa guardada</strong>{" "}
          (lo último que quedó fijado con Guardar en el historial). Si el editor muestra texto distinto sin guardar,
          guarda antes para que la nueva línea arranque con ese texto.
        </p>
        <label className="mt-4 block text-xs font-medium text-cf-text-muted">
          Nombre
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Final más oscuro"
          className="mt-1 w-full rounded-lg border border-cf-border bg-cf-bg px-3 py-2 text-sm text-cf-text"
          autoFocus
        />
        <label className="mt-3 block text-xs font-medium text-cf-text-muted">
          Intención u objetivo (opcional)
        </label>
        <textarea
          value={intention}
          onChange={(e) => setIntention(e.target.value)}
          placeholder="Ej. Aumentar tensión, menos exposición…"
          rows={3}
          className="mt-1 w-full resize-y rounded-lg border border-cf-border bg-cf-bg px-3 py-2 text-sm text-cf-text"
        />
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-cf-border px-4 py-2 text-sm text-cf-text-muted hover:bg-cf-surface-hover"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              const n = name.trim();
              if (!n) return;
              onSubmit(n, intention.trim());
            }}
            disabled={!name.trim()}
            className="rounded-lg bg-cf-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Crear variación
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Crear variación narrativa con nombre e intención (sin prompt nativo).
 */
export function NewVariationModal({
  open,
  onClose,
  onSubmit,
}: NewVariationModalProps) {
  if (!open) return null;
  return <NewVariationModalForm onClose={onClose} onSubmit={onSubmit} />;
}
