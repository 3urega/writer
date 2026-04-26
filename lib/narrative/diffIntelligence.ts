/**
 * Capa opcional de “intelligencia” narrativa: heurísticas ligeras, sin decisiones autónomas.
 */

export type NarrativePairHints = {
  wordCountA: number;
  wordCountB: number;
  deltaRatio: number;
  notes: string[];
};

function wordCount(s: string): number {
  if (!s.trim()) return 0;
  return s.trim().split(/\s+/).length;
}

/**
 * Pistas básicas al comparar dos snapshots; no reemplaza la lectura del autor.
 */
export function narrativePairHints(a: string, b: string): NarrativePairHints {
  const wa = wordCount(a);
  const wb = wordCount(b);
  const max = Math.max(1, wa, wb);
  const deltaRatio = (wb - wa) / max;
  const notes: string[] = [];
  if (Math.abs(deltaRatio) > 0.2) {
    notes.push(
      deltaRatio > 0
        ? "La variante B es claramente más extensa: revisa ritmo y redundancia."
        : "La variante B es más breve: revisa si no falta conexión entre escenas."
    );
  } else {
    notes.push("Longitud similar; el pulso de la frase o el vocabulario marcarán el tono.");
  }
  if (a === b) {
    notes.push("Los textos son idénticos: no hace falta decidir entre A y B todavía.");
  }
  return { wordCountA: wa, wordCountB: wb, deltaRatio, notes };
}
