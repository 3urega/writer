import OpenAI from "openai";

import type { AgentLlmMessage } from "../ports/types";
import type { NarrativeTextLlm } from "../ports/narrativeTextLlm";

/**
 * Chat Completions en texto plano (sin response_format JSON).
 * Requiere OPENAI_API_KEY.
 */
export function createOpenAiTextLlm(options?: {
  model?: string;
}): NarrativeTextLlm {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no está definida");
  }
  const client = new OpenAI({ apiKey });
  const model =
    options?.model ?? process.env.OPENAI_MODEL?.trim() ?? "gpt-4o-mini";

  return {
    async completeTextMessages(
      messages: AgentLlmMessage[]
    ): Promise<string> {
      const response = await client.chat.completions.create({
        model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });
      const text = response.choices[0]?.message?.content;
      if (!text?.trim()) {
        throw new Error("OpenAI devolvió contenido vacío");
      }
      return text;
    },
  };
}
