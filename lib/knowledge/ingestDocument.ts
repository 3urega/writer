import { getPrismaClient } from "../db/prisma";
import { getEmbeddingProvider } from "../ai/embedding";
import { splitIntoParagraphChunks, defaultTitleFromFilename } from "./chunking";
import { extractTextFromPdf } from "./parsePdf";

const MAX_FILE_BYTES = 12 * 1024 * 1024; // 12 MB

export type IngestParams = {
  projectId: string;
  buffer: Buffer;
  sourceFilename: string;
  titleOverride?: string;
};

/**
 * Crea documento `pending`, extrae texto, genera chunks+embeddings y pasa a `ready`
 * o marca `error`.
 */
export async function ingestPdfToKnowledge(params: IngestParams): Promise<{
  documentId: string;
}> {
  const { projectId, buffer, sourceFilename } = params;
  if (buffer.length > MAX_FILE_BYTES) {
    throw new Error(`El PDF supera el máximo de ${MAX_FILE_BYTES / 1024 / 1024} MB`);
  }

  const title =
    params.titleOverride?.trim() || defaultTitleFromFilename(sourceFilename);

  const doc = await getPrismaClient().knowledgeDocument.create({
    data: {
      projectId,
      title,
      sourceFilename,
      status: "pending",
      activeForAgent: false,
    },
  });

  try {
    const text = await extractTextFromPdf(buffer, { maxPages: 80 });
    const pieces = splitIntoParagraphChunks(text);
    if (pieces.length === 0) {
      await getPrismaClient().knowledgeDocument.update({
        where: { id: doc.id },
        data: {
          status: "error",
          errorMessage: "No se extrajo texto del PDF (vacío o no legible).",
        },
      });
      return { documentId: doc.id };
    }

    const provider = getEmbeddingProvider();
    const rows: { chunkIndex: number; text: string; embedding: number[] }[] =
      [];
    for (const p of pieces) {
      const vec = await provider.embed(p.text);
      rows.push({ chunkIndex: p.index, text: p.text, embedding: vec });
    }

    const prisma = getPrismaClient();
    await prisma.$transaction(
      [
        prisma.knowledgeChunk.createMany({
          data: rows.map((r) => ({
            documentId: doc.id,
            chunkIndex: r.chunkIndex,
            text: r.text,
            embedding: r.embedding,
          })),
        }),
        prisma.knowledgeDocument.update({
          where: { id: doc.id },
          data: { status: "ready", errorMessage: null },
        }),
      ],
      { maxWait: 30_000, timeout: 60_000 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await getPrismaClient().knowledgeDocument.update({
      where: { id: doc.id },
      data: {
        status: "error",
        errorMessage: msg.slice(0, 2000),
      },
    });
    throw e;
  }

  return { documentId: doc.id };
}
