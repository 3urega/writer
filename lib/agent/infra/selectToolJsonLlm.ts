import type { AgentLlmMessage } from "../ports/types";
import type { LlmClient } from "../ports/llmClient";

import { selectAgentOrchestratorLlm } from "./selectAgentOrchestratorLlm";

const STUB_STYLE_MARKER = "[agent-tool:extract_style]";
const STUB_EVAL_MARKER = "[agent-tool:evaluate_text]";

/**
 * LLM JSON para herramientas del agente (`extract_style`, `evaluate_text`).
 * Con `AGENT_USE_STUB` el orquestador usa un stub que no sirve para llamadas
 * anidadas; aquí devolvemos JSON fijo reconocible en tests.
 */
export function selectToolJsonLlm(projectId: string): LlmClient {
  if (
    process.env.AGENT_USE_STUB === "1" ||
    process.env.AGENT_USE_STUB === "true"
  ) {
    return {
      async completeJsonMessages(
        messages: AgentLlmMessage[]
      ): Promise<string> {
        const sys = messages.find((m) => m.role === "system")?.content ?? "";
        if (sys.includes(STUB_STYLE_MARKER)) {
          return JSON.stringify({
            tone: "stub neutro",
            sentence_style: "frases medias",
            descriptions: "breves",
            dialogue: "directo",
          });
        }
        if (sys.includes(STUB_EVAL_MARKER)) {
          return JSON.stringify({
            style_score: 7.5,
            content_preservation: 8,
            notes: ["stub: sin red real"],
          });
        }
        throw new Error(
          "AGENT_USE_STUB: prompt de tool JSON no reconocido (usa marcadores internos)"
        );
      },
    };
  }
  return selectAgentOrchestratorLlm(projectId);
}

export { STUB_STYLE_MARKER, STUB_EVAL_MARKER };
