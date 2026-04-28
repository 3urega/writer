const DEFAULT_MAX_CHUNK_CHARS = 4_000;

/**
 * Parte texto en párrafos (doble salto) y recorta tramos excesivos de forma dura.
 */
export function splitIntoParagraphChunks(
  raw: string,
  options?: { maxChunkChars?: number }
): { text: string; index: number }[] {
  const max = options?.maxChunkChars ?? DEFAULT_MAX_CHUNK_CHARS;
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) {
    return [];
  }
  const parts = normalized.split(/\n\n+/);
  const out: { text: string; index: number }[] = [];
  let i = 0;
  for (const p of parts) {
    const t = p.trim();
    if (!t) continue;
    if (t.length <= max) {
      out.push({ text: t, index: i++ });
      continue;
    }
    for (let s = 0; s < t.length; s += max) {
      const slice = t.slice(s, s + max);
      if (slice.trim()) out.push({ text: slice, index: i++ });
    }
  }
  return out;
}

export function defaultTitleFromFilename(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  return base.length > 0 ? base : "Documento sin título";
}
