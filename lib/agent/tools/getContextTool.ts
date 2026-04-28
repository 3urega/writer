import { z } from "zod";

import { getPrismaClient } from "@/lib/db/prisma";

import type { AgentTool } from "../ports/agentTool";
import type { AgentToolContext } from "../ports/types";
import { sliceVersionText } from "./sliceVersionText";

const getContextArgsSchema = z
  .object({
    version_id: z.string().uuid(),
    start_index: z.number().int().min(0),
    end_index: z.number().int().min(0),
  })
  .strict()
  .refine((x) => x.end_index >= x.start_index, {
    message: "end_index debe ser >= start_index",
  });

/**
 * Devuelve texto antes, seleccionado y después de un snapshot de versión.
 * Usa `editorContext.versionText` si coincide versionId; si no, lee la versión en Postgres.
 */
export const getContextTool: AgentTool = {
  name: "get_context",
  description:
    "Obtiene contexto alrededor de un trozo de texto: antes, seleccionado, después. " +
    "Arguments: version_id (uuid de la fila Version), start_index, end_index (índices UTF-16 en el contenido completo).",

  async execute(
    args: unknown,
    ctx: AgentToolContext
  ): Promise<{
    before: string;
    selected: string;
    after: string;
    version_id: string;
  }> {
    const parsed = getContextArgsSchema.safeParse(args);
    if (!parsed.success) {
      throw new Error(`get_context: ${z.treeifyError(parsed.error)}`);
    }
    const { version_id, start_index, end_index } = parsed.data;

    let full: string | null = null;

    if (
      ctx.editorContext?.versionId === version_id &&
      ctx.editorContext.versionText !== undefined &&
      ctx.editorContext.versionText.length >= 0
    ) {
      full = ctx.editorContext.versionText;
    } else {
      const row = await getPrismaClient().version.findFirst({
        where: {
          id: version_id,
          chapter: { projectId: ctx.projectId },
        },
        select: { content: true },
      });
      if (!row) {
        throw new Error("get_context: versión no encontrada en el proyecto");
      }
      full = row.content;
    }

    const { before, selected, after } = sliceVersionText(
      full,
      start_index,
      end_index
    );
    return { before, selected, after, version_id };
  },
};
