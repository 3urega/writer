import { getPrismaClient } from "../db/prisma";
import { searchKnowledgeForAgent, type KnowledgeChunkHit } from "./search";

export type ActiveReferenceDocument = { id: string; title: string };

/**
 * Documentos de referencia que el agente puede usar: listos y activados por el usuario.
 */
export async function getActiveReferenceDocuments(
  projectId: string
): Promise<ActiveReferenceDocument[]> {
  const rows = await getPrismaClient().knowledgeDocument.findMany({
    where: {
      projectId,
      status: "ready",
      activeForAgent: true,
    },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });
  return rows;
}

/**
 * Misma lógica que consumirá la tool de agente: solo chunks de documentos activos.
 */
export async function searchKnowledgeForAgentProject(
  projectId: string,
  query: string,
  options?: { topK?: number }
): Promise<KnowledgeChunkHit[]> {
  const topK = options?.topK ?? 5;
  return searchKnowledgeForAgent(projectId, query, topK);
}
