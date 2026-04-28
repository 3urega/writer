import OpenAI from "openai";

import type { AgentLlmMessage } from "../ports/types";
import type { LlmClient } from "../ports/llmClient";

/**
 * Cliente LLM mediante OpenAI Chat Completions con `response_format: json_object`.
 * Requiere `OPENAI_API_KEY`.
 */
export function createOpenAiJsonLlm(options?: { model?: string }): LlmClient {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no está definida");
  }
  const client = new OpenAI({ apiKey });
  const model =
    options?.model ?? process.env.OPENAI_MODEL?.trim() ?? "gpt-4o-mini";

  return {
    async completeJsonMessages(
      messages: AgentLlmMessage[]
    ): Promise<string> {
      const response = await client.chat.completions.create({
        model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        response_format: { type: "json_object" },
      });
      const text = response.choices[0]?.message?.content;
      if (!text?.trim()) {
        throw new Error("OpenAI devolvió contenido vacío");
      }
      return text;
    },
  };
}
