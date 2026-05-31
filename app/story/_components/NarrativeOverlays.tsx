"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import type { EditorialTimelineLine } from "@/lib/story/narrativeLayer";

const FALLBACK_MOMENTS = [
  {
    id: "1",
    label: "Presentación del protagonista",
    when: "Hace un momento",
  },
  { id: "2", label: "Primera grieta del misterio", when: "Hace 2 días" },
  { id: "3", label: "El secreto casi se nombra", when: "Ayer" },
] as const;

export type WorkspaceOverlayId = "assistant" | "variation" | "moments" | null;

export function OverlayBackdrop({
  open,
  onClose,
  labelledBy,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={[
          "relative z-10 max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-nm-border",
          "bg-nm-surface/95 p-5 shadow-2xl shadow-black/40 sm:p-6",
        ].join(" ")}
      >
        {children}
      </div>
    </div>
  );
}

export function SaveMomentOverlay({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (title: string) => void;
}) {
  const titleId = useId();
  const [title, setTitle] = useState("");
  const submit = useCallback(() => {
    const t = title.trim();
    if (!t) return;
    onConfirm(t);
    setTitle("");
    onClose();
  }, [title, onClose, onConfirm]);

  useEffect(() => {
    if (!open) setTitle("");
  }, [open]);

  return (
    <OverlayBackdrop open={open} onClose={onClose} labelledBy={titleId}>
      <h2
        id={titleId}
        className="text-lg font-semibold tracking-tight text-nm-text"
      >
        Guardar momento
      </h2>
      <p className="mt-2 text-sm text-nm-text-muted">
        Ponle un nombre que recuerdes con el corazón, no con el calendario.
      </p>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="p. ej. «La revelación del puerto»"
        className={[
          "mt-4 w-full rounded-xl border border-nm-border bg-nm-bg/60 px-4 py-3 text-sm text-nm-text",
          "placeholder:text-nm-text-muted focus:border-nm-primary focus:outline-none focus:ring-1 focus:ring-nm-primary/35",
        ].join(" ")}
      />
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-4 py-2.5 text-sm text-nm-text-muted hover:text-nm-text"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={!title.trim()}
          onClick={submit}
          className={[
            "rounded-full bg-nm-primary px-5 py-2.5 text-sm font-medium text-white",
            "disabled:cursor-not-allowed disabled:opacity-40",
          ].join(" ")}
        >
          Guardar momento
        </button>
      </div>
    </OverlayBackdrop>
  );
}

export function AssistantOverlay({
  open,
  onClose,
  reply,
  busy,
  variationUndoable,
  onUndoVariation,
  undoBusy,
}: {
  open: boolean;
  onClose: () => void;
  reply?: string | null;
  busy?: boolean;
  /** Hay una versión aplicada reciente; se puede volver al main anterior. */
  variationUndoable?: boolean;
  onUndoVariation?: () => void;
  undoBusy?: boolean;
}) {
  const titleId = useId();
  return (
    <OverlayBackdrop open={open} onClose={onClose} labelledBy={titleId}>
      <h2
        id={titleId}
        className="text-lg font-semibold tracking-tight text-nm-text"
      >
        Asistente narrativo
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-nm-text-muted">
        Colabora con memoria de historia y herramientas de reescritura; lo
        técnico queda oculto.
      </p>
      {busy ?
        <p className="mt-4 text-sm text-nm-primary">Pensando con tu texto…</p>
      : null}
      {variationUndoable && !busy ?
        <div className="mt-4 rounded-xl border border-nm-primary/35 bg-nm-primary/10 px-4 py-3 text-sm text-nm-text">
          <p>
            Puedes deshacer la última versión aplicada al capítulo y volver al
            texto que tenías antes en el servidor.
          </p>
          {onUndoVariation ?
            <button
              type="button"
              disabled={undoBusy}
              onClick={onUndoVariation}
              className={[
                "mt-3 w-full rounded-full border border-nm-border py-2 text-sm font-medium text-nm-text",
                "hover:bg-nm-surface-glass disabled:cursor-wait disabled:opacity-60",
              ].join(" ")}
            >
              {undoBusy ? "Revirtiendo…" : "Deshacer última variación"}
            </button>
          : null}
        </div>
      : null}
      {reply ?
        <div className="mt-4 max-h-[50vh] overflow-y-auto rounded-xl bg-nm-bg/80 p-4 text-sm leading-relaxed text-nm-text">
          {reply}
        </div>
      : !busy && !variationUndoable ?
        <p className="mt-4 text-sm italic text-nm-text-muted">
          Escribe en la barra inferior y pulsa la estrella, o elige una acción
          sobre texto seleccionado.
        </p>
      : null}
      <button
        type="button"
        onClick={onClose}
        className="mt-5 w-full rounded-full border border-nm-border py-2.5 text-sm text-nm-text-secondary hover:bg-nm-surface-glass"
      >
        Cerrar
      </button>
    </OverlayBackdrop>
  );
}

export function VariationOverlay({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}) {
  const titleId = useId();
  const [name, setName] = useState("");
  const submit = useCallback(() => {
    const n = name.trim();
    if (!n) return;
    onCreate(n);
    setName("");
    onClose();
  }, [name, onClose, onCreate]);

  return (
    <OverlayBackdrop open={open} onClose={onClose} labelledBy={titleId}>
      <h2
        id={titleId}
        className="text-lg font-semibold tracking-tight text-nm-text"
      >
        Explorar otra dirección
      </h2>
      <p className="mt-2 text-sm text-nm-text-muted">
        Ponle un nombre humano a esta posibilidad. No es una rama técnica: es
        un camino que quieres probar sin borrar lo que ya escribiste.
      </p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="p. ej. «Versión más íntima»"
        className={[
          "mt-4 w-full rounded-xl border border-nm-border bg-nm-bg/60 px-4 py-3 text-sm text-nm-text",
          "placeholder:text-nm-text-muted focus:border-nm-primary focus:outline-none focus:ring-1 focus:ring-nm-primary/35",
        ].join(" ")}
      />
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-4 py-2.5 text-sm text-nm-text-muted hover:text-nm-text"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={!name.trim()}
          onClick={submit}
          className={[
            "rounded-full bg-nm-primary px-5 py-2.5 text-sm font-medium text-white",
            "disabled:cursor-not-allowed disabled:opacity-40",
          ].join(" ")}
        >
          Crear exploración
        </button>
      </div>
    </OverlayBackdrop>
  );
}

export function SavedMomentsOverlay({
  open,
  onClose,
  timeline,
  namedMoments,
}: {
  open: boolean;
  onClose: () => void;
  timeline: EditorialTimelineLine[];
  namedMoments: Array<{ label: string; hint: string }>;
}) {
  const titleId = useId();
  const showFallback =
    timeline.length <= 2 && namedMoments.length === 0;

  return (
    <OverlayBackdrop open={open} onClose={onClose} labelledBy={titleId}>
      <h2
        id={titleId}
        className="text-lg font-semibold tracking-tight text-nm-text"
      >
        Momentos y caminos
      </h2>
      <p className="mt-1 text-sm text-nm-text-muted">
        Una lectura editorial de tu historia: sin ramas técnicas, sólo
        posibilidades.
      </p>

      {timeline.length > 0 ?
        <div
          className="mt-4 rounded-xl border border-nm-border/60 bg-nm-bg/50 p-4 font-[family-name:var(--font-editor)] text-sm leading-relaxed text-nm-text-secondary"
          aria-label="Línea editorial"
        >
          {timeline.map((line, i) => (
            <div
              key={i}
              style={{ paddingLeft: `${line.depth * 0.75}rem` }}
              className={line.depth === 0 ? "font-medium text-nm-text" : ""}
            >
              {line.depth > 0 ? "│ " : ""}
              {line.text}
            </div>
          ))}
        </div>
      : null}

      {namedMoments.length > 0 ?
        <ul className="mt-4 space-y-2">
          {namedMoments.map((m, i) => (
            <li
              key={`${m.label}-${i}`}
              className={[
                "rounded-xl border border-nm-border/80 bg-nm-surface-glass px-4 py-3",
              ].join(" ")}
            >
              <p className="text-sm font-medium text-nm-text">{m.label}</p>
              <p className="text-xs text-nm-text-muted">{m.hint}</p>
            </li>
          ))}
        </ul>
      : null}

      {showFallback ?
        <ul className="mt-4 space-y-3">
          {FALLBACK_MOMENTS.map((m) => (
            <li
              key={m.id}
              className={[
                "rounded-xl border border-nm-border/80 bg-nm-surface-glass px-4 py-3",
              ].join(" ")}
            >
              <p className="text-sm font-medium text-nm-text">{m.label}</p>
              <p className="text-xs text-nm-text-muted">{m.when}</p>
            </li>
          ))}
        </ul>
      : null}

      <button
        type="button"
        onClick={onClose}
        className="mt-5 w-full rounded-full border border-nm-border py-2.5 text-sm text-nm-text-secondary hover:bg-nm-surface-glass"
      >
        Cerrar
      </button>
    </OverlayBackdrop>
  );
}
