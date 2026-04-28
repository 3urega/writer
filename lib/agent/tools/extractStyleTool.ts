import { z } from "zod";

import { STUB_STYLE_MARKER, selectToolJsonLlm } from "../infra/selectToolJsonLlm";

import type { AgentTool } from "../ports/agentTool";
import type { AgentToolContext } from "../ports/types";

const extractStyleSchema = z.object({
  tone: z.string(),
  sentence_style: z.string(),
  descriptions: z.string(),
  dialogue: z.string(),
});

const argsSchema = z.object({
  texts: z.array(z.string().min(1).max(20_000)).min(1).max(20),
});

/**
 * Extrae reglas de estilo desde uno o más fragmentos (LLM JSON).
 */
export const extractStyleTool: AgentTool = {
  name: "extract_style",
  description:
    "A partir de muestras de texto, infiere tono, tipo de frases, descripción y diálogo para guiar reescrituras. " +
    'Input: { "texts": ["..."] }',

  async execute(
    args: unknown,
    ctx: AgentToolContext
  ): Promise<z.infer<typeof extractStyleSchema>> {
    const parsed = argsSchema.safeParse(args);
    if (!parsed.success) {
      throw new Error(`extract_style: ${z.treeifyError(parsed.error)}`);
    }
    const texts = parsed.data.texts;
    const llm = selectToolJsonLlm(ctx.projectId);
    const bundle = texts
      .map((t, i) => `--- Texto ${i + 1} ---\n${t}`)
      .join("\n\n");
    const raw = await llm.completeJsonMessages([
      {
        role: "system",
        content: [
          STUB_STYLE_MARKER,
          "Inferencia de estilo narrativo. Responde solo JSON con claves exactas:",
          "tone, sentence_style, descriptions, dialogue (strings en español).",
        ].join(" "),
      },
      {
        role: "user",
        content: `Analiza estos textos y resume el estilo:\n\n${bundle}`,
      },
    ]);
    let data: unknown;
    try {
      data = JSON.parse(raw) as unknown;
    } catch {
      throw new Error("extract_style: el modelo no devolvió JSON válido");
    }
    const out = extractStyleSchema.safeParse(data);
    if (!out.success) {
      throw new Error(`extract_style: ${z.treeifyError(out.error)}`);
    }
    return out.data;
  },
};
