import { getPrismaClient } from "../db/prisma";
import { getEmbeddingProvider } from "../ai/embedding";
import { jsonToFloatArray, cosineSimilarity } from "./cosine";

export type KnowledgeChunkHit = {
  documentId: string;
  documentTitle: string;
  chunkId: string;
  text: string;
  score: number;
};

/**
 * Búsqueda semántica solo sobre documentos `ready` y `activeForAgent`.
 */
export async function searchKnowledgeForAgent(
  projectId: string,
  query: string,
  topK: number
): Promise<KnowledgeChunkHit[]> {
  const q = query.trim();
  if (!q) return [];

  const provider = getEmbeddingProvider();
  const qVec = await provider.embed(q);

  const client = getPrismaClient();
  const docs = await client.knowledgeDocument.findMany({
    where: {
      projectId,
      status: "ready",
      activeForAgent: true,
    },
    select: { id: true, title: true },
  });
  if (docs.length === 0) return [];

  const idSet = new Set(docs.map((d) => d.id));
  const titleById = new Map(docs.map((d) => [d.id, d.title] as const));

  const chunks = await client.knowledgeChunk.findMany({
    where: { documentId: { in: [...idSet] } },
    select: { id: true, documentId: true, text: true, embedding: true },
  });

  const scored: KnowledgeChunkHit[] = [];
  for (const c of chunks) {
    if (!idSet.has(c.documentId)) continue;
    const ev = jsonToFloatArray(c.embedding);
    if (!ev) continue;
    const score = cosineSimilarity(qVec, ev);
    scored.push({
      chunkId: c.id,
      documentId: c.documentId,
      documentTitle: titleById.get(c.documentId) ?? "",
      text: c.text,
      score,
    });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.max(1, topK));
}
