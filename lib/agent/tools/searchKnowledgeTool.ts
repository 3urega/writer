import { z } from "zod";

import { searchKnowledgeForAgent } from "@/lib/knowledge/search";

import type { AgentTool } from "../ports/agentTool";
import type { AgentToolContext } from "../ports/types";

export const searchKnowledgeArgumentsSchema = z.object({
  query: z.string().min(1).max(2000),
  project_id: z.string().uuid(),
  top_k: z.number().int().min(1).max(20).optional().default(5),
});

/**
 * RAG semántico sobre documentos `ready` + `activeForAgent` del proyecto.
 * Salida alineada con tools_iniciales.md (content / source / score).
 */
export const searchKnowledgeTool: AgentTool = {
  name: "search_knowledge",
  description:
    "Busca fragmentos relevantes en la biblioteca de PDFs del proyecto (embeddings). " +
    "Requiere query, project_id (uuid del proyecto actual) y opcionalmente top_k (1-20).",

  async execute(
    args: unknown,
    ctx: AgentToolContext
  ): Promise<{
    results: Array<{
      content: string;
      /** id del documento (uuid). */
      source: string;
      document_title: string;
      score: number;
    }>;
  }> {
    const parsed = searchKnowledgeArgumentsSchema.safeParse(args);
    if (!parsed.success) {
      throw new Error(`search_knowledge: argumentos inválidos: ${z.treeifyError(parsed.error)}`);
    }
    const { query, project_id, top_k: topK } = parsed.data;
    if (project_id !== ctx.projectId) {
      throw new Error(
        "search_knowledge: project_id no coincide con el proyecto de la sesión"
      );
    }
    const hits = await searchKnowledgeForAgent(project_id, query, topK);
    return {
      results: hits.map((h) => ({
        content: h.text,
        source: h.documentId,
        document_title: h.documentTitle,
        score: h.score,
      })),
    };
  },
};
