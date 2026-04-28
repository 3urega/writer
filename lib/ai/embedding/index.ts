import { createOllamaEmbeddingProvider } from "./ollamaEmbedding";
import type { EmbeddingProvider } from "./types";

/**
 * Instancia de embedding para el proceso actual. Solo servidor.
 */
let cached: EmbeddingProvider | null = null;

export function getEmbeddingProvider(): EmbeddingProvider {
  if (cached) return cached;
  cached = createOllamaEmbeddingProvider();
  return cached;
}

/** Para tests o inyección. */
export function setEmbeddingProviderForTests(p: EmbeddingProvider | null) {
  cached = p;
}

export type { EmbeddingProvider } from "./types";
export { createOllamaEmbeddingProvider } from "./ollamaEmbedding";
