/**
 * Vista por bloques derivada de texto plano (no otro almacenamiento; prepara editor estructurado futuro).
 */
export type TextBlock = { id: string; index: number; text: string };

export function splitIntoBlocks(content: string): TextBlock[] {
  const parts = content.split(/\n\n+/);
  return parts
    .map((t, i) => ({ id: `blk-${i}`, index: i, text: t }))
    .filter((b) => b.text.length > 0);
}
