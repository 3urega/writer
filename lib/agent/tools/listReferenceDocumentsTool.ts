import { z } from "zod";

import { getActiveReferenceDocuments } from "@/lib/knowledge/agentContext";

import type { AgentTool } from "../ports/agentTool";
import type { AgentToolContext } from "../ports/types";

const argsSchema = z.object({
  project_id: z.string().uuid(),
});

/**
 * Lista documentos de referencia activos para el agente (`ready`, `activeForAgent`).
 */
export const listReferenceDocumentsTool: AgentTool = {
  name: "list_reference_documents",
  description:
    "Lista los títulos (y uuid) de la biblioteca de PDFs disponibles para RAG en este proyecto. Argumento project_id debe coincidir con la sesión.",

  async execute(
    args: unknown,
    ctx: AgentToolContext
  ): Promise<{
    documents: Array<{ id: string; title: string }>;
  }> {
    const parsed = argsSchema.safeParse(args);
    if (!parsed.success) {
      throw new Error(
        `list_reference_documents: ${z.treeifyError(parsed.error)}`
      );
    }
    if (parsed.data.project_id !== ctx.projectId) {
      throw new Error(
        "list_reference_documents: project_id no coincide con el proyecto de la sesión"
      );
    }
    const rows = await getActiveReferenceDocuments(ctx.projectId);
    return {
      documents: rows.map((d) => ({ id: d.id, title: d.title })),
    };
  },
};
