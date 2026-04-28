/**
 * Extrae texto plano de un buffer PDF.
 * Importación dinámica: el paquete `pdf-parse` no debe cargarse en top-level (evita ENOENT en build).
 */
export async function extractTextFromPdf(
  buffer: Buffer,
  options?: { maxPages?: number }
): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default;
  const max = options?.maxPages ?? 100;
  const data = await pdfParse(buffer, { max });
  const text = typeof data.text === "string" ? data.text : "";
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}
