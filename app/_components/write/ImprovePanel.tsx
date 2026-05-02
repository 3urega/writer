"use client";

import { useCallback, useState } from "react";

import type { Fragment } from "@/lib/domain/types";

const SUGGESTIONS = [
  "Aumenta la tensión de la escena sin cambiar los hechos.",
  "Mejora el ritmo y acorta frases largas.",
  "Haz el diálogo más filoso y natural.",
  "Añade atmósfera y detalles sensoriales suaves.",
  "Reduce la exposición y muestra más a través de acción.",
] as const;

type ImprovePanelProps = {
  projectId: string | null;
  activeVersionId: string;
  fullDocumentText: string;
  fragment: Fragment | null;
  /** Trae el grafo del servidor sin modificar el borrador hasta que el usuario pulse. */
  onRefreshProjectFromServer: () => Promise<void>;
  /** Aplica texto sugerido al borrador de forma explícita (no automática). */
  onApplySuggestedText: (text: string) => void;
  /** Texto inicial del área de instrucción (p. ej. desde la barra de selección). */
  initialMessage?: string;
};

type AgentApiResponse = {
  reply: string | null;
  steps: { toolName?: string; toolResultSummary?: string }[];
  stoppedReason: string;
};

/**
 * Panel de asistencia de IA: el servidor no sustituye tu borrador sin paso explícito.
 */
export function ImprovePanel({
  projectId,
  activeVersionId,
  fullDocumentText,
  fragment,
  onRefreshProjectFromServer,
  onApplySuggestedText,
  initialMessage = "",
}: ImprovePanelProps) {
  const [message, setMessage] = useState(initialMessage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AgentApiResponse | null>(null);
  const [pendingServerVersion, setPendingServerVersion] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const appendSuggestion = useCallback((s: string) => {
    setMessage((m) => (m.trim() ? `${m.trim()}\n\n${s}` : s));
  }, []);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!projectId) {
      setError("Conecta el proyecto al servidor para usar la IA.");
      return;
    }
    const msg = message.trim();
    if (!msg) return;
    setError(null);
    setResult(null);
    setPendingServerVersion(false);
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        projectId,
        message: msg,
        maxSteps: 6,
      };
      if (fragment && fragment.end > fragment.start) {
        body.editorContext = {
          versionId: activeVersionId,
          startIndex: fragment.start,
          endIndex: fragment.end,
          versionText: fullDocumentText,
        };
      }
      const r = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await r.json().catch(() => ({}))) as {
        error?: string;
        reply?: string | null;
        steps?: AgentApiResponse["steps"];
        stoppedReason?: string;
      };
      if (!r.ok) {
        throw new Error(data.error ?? `HTTP ${r.status}`);
      }
      const steps = Array.isArray(data.steps) ? data.steps : [];
      const touchedVersion = steps.some(
        (s) => s && s.toolName === "create_version"
      );
      setResult({
        reply: data.reply ?? null,
        steps,
        stoppedReason: data.stoppedReason ?? "?",
      });
      setPendingServerVersion(touchedVersion);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  if (!projectId) {
    return (
      <p className="rounded-lg border border-dashed border-cf-border p-4 text-sm text-cf-text-muted">
        Conecta el proyecto al servidor para usar mejoras con IA. Tú decides si incorporar la respuesta
        al borrador o actualizar el historial en el servidor.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-cf-text-muted">
        Solicita mejoras como a un editor. La respuesta es una <strong className="text-cf-text">sugerencia</strong>:
        revísala y elige si añadirla al texto o solo actualizar el historial si el agente creó una versión nueva.
      </p>
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => appendSuggestion(s)}
            className="rounded-full border border-cf-border bg-cf-bg/60 px-3 py-1 text-left text-xs text-cf-text-muted hover:border-cf-primary/40 hover:text-cf-primary"
          >
            {s}
          </button>
        ))}
      </div>
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-2">
        <label className="block text-xs font-medium text-cf-text-muted">
          Instrucción
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="Describe qué quieres pulir en el texto o en la selección actual…"
          className="w-full rounded-lg border border-cf-border bg-cf-bg px-3 py-2 text-sm text-cf-text"
        />
        {fragment && fragment.end > fragment.start ? (
          <p className="text-xs text-cf-text-muted">
            Se enviará el contexto de la selección ({fragment.start}–{fragment.end}).
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading || !message.trim()}
          className="rounded-lg bg-cf-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Trabajando…" : "Enviar al editor IA"}
        </button>
      </form>
      {error ? (
        <p className="rounded-lg border border-red-500/40 bg-red-950/20 p-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      {pendingServerVersion ? (
        <div className="rounded-lg border border-cf-warning/40 bg-cf-warning/10 p-3 text-sm text-cf-text">
          <p className="font-medium text-cf-warning">Posible nueva versión en el servidor</p>
          <p className="mt-1 text-xs text-cf-text-muted">
            Tu borrador local no se ha modificado. Trae el proyecto actualizado para verla en el panel de versiones.
          </p>
          <button
            type="button"
            disabled={refreshing}
            onClick={() => {
              setRefreshing(true);
              void onRefreshProjectFromServer()
                .then(() => setPendingServerVersion(false))
                .finally(() => setRefreshing(false));
            }}
            className="mt-2 rounded-lg border border-cf-border bg-cf-bg px-3 py-1.5 text-xs font-medium text-cf-text disabled:opacity-50"
          >
            {refreshing ? "Actualizando…" : "Traer historial desde el servidor"}
          </button>
        </div>
      ) : null}
      {result?.reply ? (
        <div className="rounded-lg border border-cf-border bg-cf-bg/50 p-3">
          <p className="text-xs font-medium text-cf-text-muted">Vista previa — respuesta del agente</p>
          <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap text-sm text-cf-text">
            {result.reply}
          </p>
          <p className="mt-2 text-[10px] text-cf-text-muted">Estado: {result.stoppedReason}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onApplySuggestedText(result.reply ?? "")}
              className="rounded-lg bg-cf-primary px-3 py-1.5 text-xs font-medium text-white"
            >
              Añadir al borrador
            </button>
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setPendingServerVersion(false);
              }}
              className="rounded-lg border border-cf-border px-3 py-1.5 text-xs text-cf-text-muted"
            >
              Cerrar vista previa
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}