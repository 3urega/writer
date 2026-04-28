import type { EmbeddingProvider } from "./types";

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * Ollama local: `POST /api/embed` o `POST /api/embeddings` con modelo de embedding.
 * Variables: OLLAMA_BASE_URL (default `http://127.0.0.1:11434`), OLLAMA_EMBEDDING_MODEL,
 * EMBEDDING_DIMENSION (p. ej. 768 para nomic-embed-text).
 */
export function createOllamaEmbeddingProvider(
  options?: {
    baseUrl?: string;
    model?: string;
    expectedDimension?: number;
  }
): EmbeddingProvider {
  const baseUrl = normalizeBaseUrl(
    options?.baseUrl ?? process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434"
  );
  const model =
    options?.model ?? process.env.OLLAMA_EMBEDDING_MODEL ?? "nomic-embed-text";
  const dimension =
    options?.expectedDimension ??
    parseInt(process.env.EMBEDDING_DIMENSION ?? "768", 10);

  async function embedRequest(path: "embed" | "embeddings", body: object) {
    const r = await fetch(`${baseUrl}/api/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(
        `Ollama embedding (${path}) ${r.status}: ${t.slice(0, 200)}`
      );
    }
    return r.json() as Promise<Record<string, unknown>>;
  }

  return {
    dimension,
    async embed(text: string) {
      if (!text.trim()) {
        throw new Error("El texto a embeber no puede estar vacío");
      }
      let data: Record<string, unknown>;
      try {
        data = await embedRequest("embed", { model, input: text });
      } catch (e1) {
        try {
          data = await embedRequest("embeddings", {
            model,
            prompt: text,
          });
        } catch (e2) {
          const err = e1 instanceof Error ? e1 : new Error(String(e1));
          throw new Error(
            `No se pudo obtener embedding con /api/embed ni /api/embeddings: ${err.message}`
          );
        }
      }
      // /api/embed (nuevo): { embeddings: number[][] } con un solo input
      const embs = data["embeddings"] as number[][] | undefined;
      if (embs && embs[0] && Array.isArray(embs[0])) {
        return assertDim(embs[0], dimension, model);
      }
      const one = data["embedding"] as number[] | undefined;
      if (one && Array.isArray(one)) {
        return assertDim(one, dimension, model);
      }
      // algunos despliegues anidadas
      const nested = (data as { data?: { embedding?: number[] } }).data
        ?.embedding;
      if (nested && Array.isArray(nested)) {
        return assertDim(nested, dimension, model);
      }
      throw new Error("Respuesta de Ollama sin array de embedding reconocible");
    },
  };
}

function assertDim(
  vec: number[],
  expected: number,
  model: string
): number[] {
  if (vec.length === 0) {
    throw new Error("Vector de embedding vacío");
  }
  if (expected > 0 && vec.length !== expected) {
    throw new Error(
      `Dimensión del embedding (${vec.length}) no coincide con EMBEDDING_DIMENSION=${expected} (modelo ${model})`
    );
  }
  return vec;
}
