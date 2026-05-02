"use client";

import { useState } from "react";

import { getStoredRemoteProjectId } from "@/lib/storage/remoteProjectId";

type AgentApiResponse = {
  reply: string | null;
  steps: unknown[];
  stoppedReason: string;
};

const envDefaultProjectId =
  typeof process !== "undefined"
    ? (process.env.NEXT_PUBLIC_DEFAULT_PROJECT_ID?.trim() ?? "")
    : "";

export function AgentConsole() {
  const [projectId, setProjectId] = useState(() => {
    if (typeof window === "undefined") return "";
    const stored = getStoredRemoteProjectId();
    if (stored) return stored;
    if (envDefaultProjectId) return envDefaultProjectId;
    return "";
  });
  const [message, setMessage] = useState(
    "Busca en mi biblioteca patrones de diálogo tenso."
  );
  const [maxSteps, setMaxSteps] = useState(5);
  const [versionId, setVersionId] = useState("");
  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState(200);
  const [versionText, setVersionText] = useState("");
  const [useEditorContext, setUseEditorContext] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AgentApiResponse | null>(null);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        projectId: projectId.trim(),
        message: message.trim(),
        maxSteps,
      };
      if (useEditorContext && versionId.trim()) {
        body.editorContext = {
          versionId: versionId.trim(),
          startIndex,
          endIndex,
          ...(versionText.trim() ? { versionText: versionText } : {}),
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
        steps?: unknown[];
        stoppedReason?: string;
      };
      if (!r.ok) {
        throw new Error(data.error ?? `HTTP ${r.status}`);
      }
      setResult({
        reply: data.reply ?? null,
        steps: data.steps ?? [],
        stoppedReason: data.stoppedReason ?? "?",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-cf-text-muted">
            projectId (UUID remoto o el de .env)
          </label>
          <input
            className="mt-1 w-full rounded-md border border-cf-border bg-cf-surface px-3 py-2 text-sm text-cf-text"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="uuid"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-cf-text-muted">
            Mensaje
          </label>
          <textarea
            className="mt-1 min-h-[100px] w-full rounded-md border border-cf-border bg-cf-surface px-3 py-2 text-sm text-cf-text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-cf-text-muted">
            maxSteps (1–15)
          </label>
          <input
            type="number"
            min={1}
            max={15}
            className="mt-1 w-24 rounded-md border border-cf-border bg-cf-surface px-3 py-2 text-sm text-cf-text"
            value={maxSteps}
            onChange={(e) => setMaxSteps(Number(e.target.value))}
          />
        </div>

        <div className="rounded-md border border-cf-border p-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-cf-text">
            <input
              type="checkbox"
              checked={useEditorContext}
              onChange={(e) => setUseEditorContext(e.target.checked)}
            />
            Incluir editorContext (get_context: version + índices; opcional versionText)
          </label>
          {useEditorContext ? (
            <div className="mt-3 space-y-2">
              <input
                className="w-full rounded-md border border-cf-border bg-cf-surface px-2 py-1 text-xs text-cf-text"
                placeholder="versionId (uuid)"
                value={versionId}
                onChange={(e) => setVersionId(e.target.value)}
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  className="w-24 rounded-md border border-cf-border bg-cf-surface px-2 py-1 text-xs text-cf-text"
                  value={startIndex}
                  onChange={(e) => setStartIndex(Number(e.target.value))}
                />
                <input
                  type="number"
                  className="w-24 rounded-md border border-cf-border bg-cf-surface px-2 py-1 text-xs text-cf-text"
                  value={endIndex}
                  onChange={(e) => setEndIndex(Number(e.target.value))}
                />
              </div>
              <textarea
                className="min-h-[80px] w-full rounded-md border border-cf-border bg-cf-surface px-2 py-1 text-xs text-cf-text"
                placeholder="versionText completo (opcional; si vacío se lee de Postgres)"
                value={versionText}
                onChange={(e) => setVersionText(e.target.value)}
              />
            </div>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {loading ? "Enviando…" : "Ejecutar agente"}
        </button>
      </form>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      {result ? (
        <div className="space-y-2">
          <p className="text-xs text-cf-text-muted">
            stoppedReason: {result.stoppedReason}
          </p>
          {result.reply ? (
            <div>
              <h3 className="text-xs font-medium text-cf-text-muted">
                Respuesta (reply)
              </h3>
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-cf-border bg-cf-surface p-2 text-xs text-cf-text">
                {result.reply}
              </pre>
            </div>
          ) : null}
          <div>
            <h3 className="text-xs font-medium text-cf-text-muted">steps</h3>
            <pre className="max-h-96 overflow-auto rounded-md border border-cf-border bg-zinc-950 p-2 text-xs text-emerald-200">
              {JSON.stringify(result.steps, null, 2)}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
