import { z } from "zod";

import { createAgentVersion } from "../application/createAgentVersion";

import type { AgentTool } from "../ports/agentTool";
import type { AgentToolContext } from "../ports/types";

const metadataSchema = z
  .object({
    source: z.string().optional(),
    task: z.string().optional(),
  })
  .passthrough()
  .optional();

const argsSchema = z.object({
  chapter_id: z.string().uuid(),
  base_version_id: z.string().uuid(),
  new_content: z.string().min(0).max(2_000_000),
  project_id: z.string().uuid(),
  metadata: metadataSchema,
});

/**
 * Persiste una nueva snapshot en el proyecto (misma persistencia que el editor).
 */
export const createVersionTool: AgentTool = {
  name: "create_version",
  description:
    "Guarda nuevo contenido como nueva versión inmutable sobre una versión base del capítulo. " +
    "Arguments: chapter_id, base_version_id, new_content, project_id (uuid de sesión), metadata opcional { source, task }. " +
    "Devuelve version_id; no marca la versión como oficial del capítulo.",

  async execute(
    args: unknown,
    ctx: AgentToolContext
  ): Promise<{ version_id: string }> {
    const parsed = argsSchema.safeParse(args);
    if (!parsed.success) {
      throw new Error(`create_version: ${z.treeifyError(parsed.error)}`);
    }
    const d = parsed.data;
    if (d.project_id !== ctx.projectId) {
      throw new Error(
        "create_version: project_id no coincide con el proyecto de la sesión"
      );
    }
    const result = await createAgentVersion({
      projectId: d.project_id,
      chapterId: d.chapter_id,
      baseVersionId: d.base_version_id,
      newContent: d.new_content,
      metadata: d.metadata ?? undefined,
    });
    return { version_id: result.versionId };
  },
};
