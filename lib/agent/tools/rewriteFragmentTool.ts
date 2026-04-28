import { z } from "zod";

import { rewriteFragmentWithConfiguredProvider } from "../infra/rewriteFragmentProvider";

import type { AgentTool } from "../ports/agentTool";
import type { AgentToolContext } from "../ports/types";

const rewriteArgsSchema = z
  .object({
    fragment_text: z.string().min(1).max(50_000),
    context_before: z.string().max(50_000).optional().default(""),
    context_after: z.string().max(50_000).optional().default(""),
    instructions: z.string().min(1).max(4000),
    style: z.record(z.string(), z.string()).optional(),
  })
  .strict();

/**
 * Reescribe un fragmento (OpenAI u Ollama según entorno; ver `rewriteFragmentProvider`).
 */
export const rewriteFragmentTool: AgentTool = {
  name: "rewrite_fragment",
  description:
    "Reescribe un fragmento de texto manteniendo coherencia con el contexto antes/después. " +
    "Arguments: fragment_text, context_before, context_after, instructions obligatorios; style opcional (mapa string→string).",

  async execute(
    args: unknown,
    _ctx: AgentToolContext
  ): Promise<{ rewritten_text: string; note?: string }> {
    const parsed = rewriteArgsSchema.safeParse(args);
    if (!parsed.success) {
      throw new Error(`rewrite_fragment: ${z.treeifyError(parsed.error)}`);
    }
    const d = parsed.data;

    const rewritten_text = await rewriteFragmentWithConfiguredProvider({
      fragment_text: d.fragment_text,
      context_before: d.context_before,
      context_after: d.context_after,
      instructions: d.instructions,
      style: d.style,
    });

    return {
      rewritten_text,
      ...(rewritten_text.startsWith("[stub] ")
        ? { note: "AGENT_USE_STUB: salida simulada." }
        : {}),
    };
  },
};
