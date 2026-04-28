/**
 * Abstracción de proveedores de embedding (Ollama local, APIs futuras en prod).
 */
export type EmbeddingProvider = {
  /** Dimensión del vector (debe coincidir con almacenamiento e índice). */
  readonly dimension: number;
  /** Vector de un único segmento de texto. */
  embed: (text: string) => Promise<number[]>;
};
