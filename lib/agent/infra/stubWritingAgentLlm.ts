import type { AgentLlmMessage } from "../ports/types";
import type { LlmClient } from "../ports/llmClient";

/**
 * LLM de desarrollo sin API externa: primero ejecuta `search_knowledge`; luego responde `final`.
 */
export function createStubWritingAgentLlm(projectId: string): LlmClient {
  return {
    async completeJsonMessages(
      messages: AgentLlmMessage[]
    ): Promise<string> {
      const hasToolResult = messages.some(
        (m) =>
          m.role === "assistant" && m.content.includes('"tool_result"')
      );

      if (!hasToolResult) {
        const lastUser =
          [...messages].reverse().find((m) => m.role === "user")?.content ??
          "";
        return JSON.stringify({
          thought:
            "(stub) Plan: buscar en la biblioteca de conocimiento por similitud semántica.",
          action: {
            name: "search_knowledge",
            arguments: {
              query: lastUser.slice(0, 2000),
              project_id: projectId,
              top_k: 5,
            },
          },
        });
      }

      return JSON.stringify({
        thought:
          "(stub) Resumen tras herramienta: usa tool_result anterior si necesitas detalle.",
        final:
          "[stub] Ejecución de agente lista sin red. Quita AGENT_USE_STUB y usa Ollama u OPENAI.",
      });
    },
  };
}
