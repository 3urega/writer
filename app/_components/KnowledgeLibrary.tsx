"use client";

import { useCallback, useEffect, useState } from "react";

import type { KnowledgeDocumentDto } from "@/lib/storage/knowledgeClient";
import {
  fetchKnowledgeDocuments,
  patchKnowledgeDocument,
  uploadKnowledgePdf,
} from "@/lib/storage/knowledgeClient";

type KnowledgeLibraryProps = {
  projectId: string | null;
};

function TitleField({
  docId,
  value,
  onSave,
}: {
  docId: string;
  value: string;
  onSave: (id: string, next: string, previous: string) => void;
}) {
  return (
    <TitleFieldInner
      key={`${docId}:${value}`}
      docId={docId}
      value={value}
      onSave={onSave}
    />
  );
}

function TitleFieldInner({
  docId,
  value,
  onSave,
}: {
  docId: string;
  value: string;
  onSave: (id: string, next: string, previous: string) => void;
}) {
  const [v, setV] = useState(value);
  return (
    <input
      type="text"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => onSave(docId, v, value)}
      className="w-full border-b border-transparent bg-transparent font-medium text-zinc-900 focus:border-violet-500 focus:outline-none dark:text-zinc-100"
      aria-label="Título de referencia"
    />
  );
}

function statusLabel(s: KnowledgeDocumentDto["status"]): string {
  switch (s) {
    case "pending":
      return "Indexando…";
    case "ready":
      return "Listo";
    case "error":
      return "Error";
    default:
      return s;
  }
}

export function KnowledgeLibrary({ projectId }: KnowledgeLibraryProps) {
  const [docs, setDocs] = useState<KnowledgeDocumentDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await fetchKnowledgeDocuments(projectId);
      setDocs(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar la biblioteca");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !projectId) return;
    setUploading(true);
    setError(null);
    try {
      const doc = await uploadKnowledgePdf(
        projectId,
        file,
        uploadTitle.trim() || undefined
      );
      setUploadTitle("");
      setDocs((prev) => {
        const next = prev.filter((d) => d.id !== doc.id);
        return [doc, ...next];
      });
      if (doc.status === "error") {
        setError(doc.errorMessage ?? "No se pudo indexar el PDF.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setUploading(false);
    }
  };

  const saveTitle = useCallback(
    async (docId: string, next: string, previous: string) => {
      const t = next.trim();
      if (!projectId || !t || t === previous) return;
      try {
        const updated = await patchKnowledgeDocument(projectId, docId, { title: t });
        setDocs((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar el título");
      }
    },
    [projectId]
  );

  const toggleAgent = async (doc: KnowledgeDocumentDto, active: boolean) => {
    if (!projectId) return;
    try {
      const updated = await patchKnowledgeDocument(projectId, doc.id, {
        activeForAgent: active,
      });
      setDocs((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al actualizar la referencia"
      );
    }
  };

  if (!projectId) {
    return (
      <section className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
        Conecta el proyecto al servidor para usar la biblioteca de referencia (PDFs).
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Biblioteca de referencia
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Sube PDFs para estilo y contexto. Activa por título los que debe considerar el
            agente al escribir.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="text-xs text-zinc-600 underline disabled:opacity-50 dark:text-zinc-400"
        >
          Actualizar lista
        </button>
      </div>

      {error ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label className="mb-0.5 block text-xs text-zinc-500">
            Título (opcional, antes de subir)
          </label>
          <input
            type="text"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
            placeholder="P. ej. Guía de tono 2024"
            className="w-full rounded border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>
        <label className="inline-flex cursor-pointer items-center justify-center rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
          {uploading ? "Subiendo…" : "Subir PDF"}
          <input
            type="file"
            accept=".pdf,application/pdf"
            className="sr-only"
            disabled={uploading}
            onChange={onFile}
          />
        </label>
      </div>

      {loading && docs.length === 0 ? (
        <p className="text-xs text-zinc-500">Cargando…</p>
      ) : null}

      <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">
        {docs.map((d) => (
          <li
            key={d.id}
            className="rounded-md border border-zinc-200 p-2 dark:border-zinc-800"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <TitleField
                  docId={d.id}
                  value={d.title}
                  onSave={(id, t, prev) => void saveTitle(id, t, prev)}
                />
                <p className="mt-0.5 truncate text-[11px] text-zinc-500" title={d.sourceFilename}>
                  Archivo: {d.sourceFilename}
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  {statusLabel(d.status)}
                  {d.status === "error" && d.errorMessage
                    ? ` — ${d.errorMessage.slice(0, 120)}${d.errorMessage.length > 120 ? "…" : ""}`
                    : null}
                </p>
              </div>
              <label className="flex shrink-0 items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={d.activeForAgent}
                  disabled={d.status !== "ready"}
                  onChange={(e) => void toggleAgent(d, e.target.checked)}
                />
                Incluir en el trabajo del agente
              </label>
            </div>
          </li>
        ))}
      </ul>

      {docs.length === 0 && !loading ? (
        <p className="text-xs text-zinc-500">Aún no hay documentos en esta biblioteca.</p>
      ) : null}
    </section>
  );
}
