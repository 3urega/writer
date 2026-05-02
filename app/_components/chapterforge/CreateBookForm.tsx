"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createInitialProject } from "@/lib/domain/versioning";
import { setStoredRemoteProjectId } from "@/lib/storage/remoteProjectId";
import { createProjectOnServer } from "@/lib/storage/serverProjectClient";

/**
 * Crea un libro en el servidor y navega a /write con el id guardado.
 */
export function CreateBookForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    const name = title.trim() || "Sin título";
    setLoading(true);
    try {
      const { project } = createInitialProject(name);
      const id = await createProjectOnServer(project);
      setStoredRemoteProjectId(id);
      router.push(`/write?project=${encodeURIComponent(id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el libro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="rounded-xl border border-cf-border bg-cf-surface/60 p-4"
    >
      <h2 className="text-sm font-semibold text-cf-text">Nuevo libro</h2>
      <p className="mt-1 text-xs text-cf-text-muted">
        Título y espacio de escritura; luego podrás añadir capítulos y variaciones.
      </p>
      <label className="mt-3 block text-xs font-medium text-cf-text-muted">
        Título
      </label>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Sombras de invierno"
        className="mt-1 w-full rounded-lg border border-cf-border bg-cf-bg px-3 py-2 text-sm text-cf-text"
      />
      {error ?
        <p className="mt-2 text-xs text-red-300">{error}</p>
      : null}
      <button
        type="submit"
        disabled={loading}
        className="mt-3 w-full rounded-lg bg-cf-primary py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "Creando…" : "Crear y escribir"}
      </button>
    </form>
  );
}
