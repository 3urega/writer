"use client";

import { useState } from "react";

import type { Fragment } from "@/lib/domain/types";

type ImprovePanelProps = {
  projectId: string | null;
  activeVersionId: string;
  fullDocumentText: string;
  fragment: Fragment | null;
  onApplyFragmentRewrite: (newFullDocumentText: string) => void;
};

function hasFragmentSelection(fragment: Fragment | null): fragment is Fragment {
  return fragment != null && fragment.end > fragment.start;
}

/**
 * Mejora con IA: reescribe el fragmento seleccionado y aplica el resultado en el editor.
 */
export function ImprovePanel({
  projectId,
  activeVersionId,
  fullDocumentText,
  fragment,
  onApplyFragmentRewrite,
}: ImprovePanelProps) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasSelection = hasFragmentSelection(fragment);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!projectId || !hasSelection) return;
    const instructions = message.trim();
    if (!instructions) return;

    setError(null);
    setLoading(true);
    try {
      const r = await fetch("/api/agent/rewrite-fragment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          instructions,
          editorContext: {
            versionId: activeVersionId,
            startIndex: fragment.start,
            endIndex: fragment.end,
            versionText: fullDocumentText,
          },
        }),
      });
      const data = (await r.json().catch(() => ({}))) as {
        error?: string;
        rewrittenText?: string;
      };
      if (!r.ok) {
        throw new Error(data.error ?? `HTTP ${r.status}`);
      }
      const rewrittenText = data.rewrittenText;
      if (typeof rewrittenText !== "string") {
        throw new Error("Respuesta inválida del servidor");
      }
      const newFullDocumentText =
        fullDocumentText.slice(0, fragment.start) +
        rewrittenText +
        fullDocumentText.slice(fragment.end);
      onApplyFragmentRewrite(newFullDocumentText);
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  if (!projectId) {
    return (
      <p className="rounded-lg border border-dashed border-cf-border p-4 text-sm text-cf-text-muted">
        Conecta el proyecto al servidor para usar mejoras con IA.
      </p>
    );
  }

  if (!hasSelection) {
    return (
      <div className="rounded-lg border border-dashed border-cf-border bg-cf-bg/40 p-4 text-sm text-cf-text-muted">
        <p className="font-medium text-cf-text">Selecciona texto en el editor</p>
        <p className="mt-1 text-xs leading-relaxed">
          Marca el fragmento que quieres pulir; aquí verás una vista previa y podrás escribir la
          instrucción para la IA.
        </p>
      </div>
    );
  }

  const canSubmit = !loading && message.trim().length > 0;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-cf-text-muted">
          Fragmento seleccionado
        </h3>
        <p className="mt-0.5 text-[10px] text-cf-text-muted">
          {fragment.start}–{fragment.end} · {fragment.text.length.toLocaleString("es-ES")}{" "}
          caracteres
        </p>
        <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-cf-border bg-cf-bg/50 p-2 text-sm leading-relaxed whitespace-pre-wrap text-cf-text">
          {fragment.text}
        </div>
      </div>

      <form className="space-y-2" onSubmit={(e) => void onSubmit(e)}>
        <label className="block text-xs font-medium text-cf-text-muted" htmlFor="improve-instruction">
          Instrucción
        </label>
        <textarea
          id="improve-instruction"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          disabled={loading}
          placeholder="Ej. Más tensión, frases más cortas, diálogo más natural…"
          className="w-full rounded-lg border border-cf-border bg-cf-bg px-3 py-2 text-sm text-cf-text disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-lg bg-cf-primary px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Reescribiendo…" : "Enviar"}
        </button>
        <p className="text-[10px] leading-relaxed text-cf-text-muted">
          El texto reescrito se aplicará en el editor y se guardará como nueva versión en el
          historial.
        </p>
      </form>
      {error ? (
        <p className="rounded-lg border border-red-500/40 bg-red-950/20 p-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}
