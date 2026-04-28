/**
 * Obtiene texto antes / seleccionado / después por índices en cadena cerrada UTF-16.
 */
export function sliceVersionText(
  content: string,
  startIndex: number,
  endIndex: number
): { before: string; selected: string; after: string } {
  const len = content.length;
  const a = Math.max(0, Math.min(Math.floor(startIndex), len));
  const b = Math.max(a, Math.min(Math.floor(endIndex), len));
  return {
    before: content.slice(0, a),
    selected: content.slice(a, b),
    after: content.slice(b),
  };
}
