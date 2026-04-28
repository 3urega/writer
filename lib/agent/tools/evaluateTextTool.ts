import { z } from "zod";

import { STUB_EVAL_MARKER, selectToolJsonLlm } from "../infra/selectToolJsonLlm";

import type { AgentTool } from "../ports/agentTool";
import type { AgentToolContext } from "../ports/types";

const evaluateSchema = z.object({
  style_score: z.number().min(0).max(10),
  content_preservation: z.number().min(0).max(10),
  notes: z.array(z.string()),
});

const argsSchema = z.object({
  original_text: z.string().min(1).max(100_000),
  rewritten_text: z.string().min(1).max(100_000),
});

/**
 * Compara original vs reescrito (LLM JSON).
 */
export const evaluateTextTool: AgentTool = {
  name: "evaluate_text",
  description:
    "Evalúa calidad de una reescritura frente al original (ritmo, voz, fidelidad). " +
    'Input: { "original_text", "rewritten_text" }',

  async execute(
    args: unknown,
    ctx: AgentToolContext
  ): Promise<z.infer<typeof evaluateSchema>> {
    const parsed = argsSchema.safeParse(args);
    if (!parsed.success) {
      throw new Error(`evaluate_text: ${z.treeifyError(parsed.error)}`);
    }
    const { original_text, rewritten_text } = parsed.data;
    const llm = selectToolJsonLlm(ctx.projectId);
    const raw = await llm.completeJsonMessages([
      {
        role: "system",
        content: [
          STUB_EVAL_MARKER,
          "Comparas dos textos (reescritura). Responde solo JSON:",
          "style_score y content_preservation de 0 a 10,",
          "notes array de strings breves en español.",
        ].join(" "),
      },
      {
        role: "user",
        content: [
          "ORIGINAL:",
          "```",
          original_text,
          "```",
          "",
          "REESCRITO:",
          "```",
          rewritten_text,
          "```",
        ].join("\n"),
      },
    ]);
    let data: unknown;
    try {
      data = JSON.parse(raw) as unknown;
    } catch {
      throw new Error("evaluate_text: el modelo no devolvió JSON válido");
    }
    const out = evaluateSchema.safeParse(data);
    if (!out.success) {
      throw new Error(`evaluate_text: ${z.treeifyError(out.error)}`);
    }
    return out.data;
  },
};
