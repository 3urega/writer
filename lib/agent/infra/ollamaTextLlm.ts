import type { AgentLlmMessage } from "../ports/types";
import type { NarrativeTextLlm } from "../ports/narrativeTextLlm";

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

type OllamaChatResponse = {
  message?: {
    content?: string;
  };
  error?: string;
};

/**
 * Ollama `/api/chat` sin format JSON forzado (respuesta en prosa).
 */
export function createOllamaTextLlm(options?: {
  baseUrl?: string;
  model?: string;
}): NarrativeTextLlm {
  const baseUrl = normalizeBaseUrl(
    options?.baseUrl ??
      process.env.OLLAMA_BASE_URL ??
      "http://127.0.0.1:11434"
  );
  const model =
    options?.model ??
    process.env.OLLAMA_AGENT_MODEL?.trim() ??
    "llama3.1:8b";

  return {
    async completeTextMessages(
      messages: AgentLlmMessage[]
    ): Promise<string> {
      const r = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: messages.map((m) => ({
            role:
              m.role === "system"
                ? "system"
                : m.role === "assistant"
                  ? "assistant"
                  : "user",
            content: m.content,
          })),
          stream: false,
        }),
      });
      const raw = await r.text();
      if (!r.ok) {
        throw new Error(`Ollama chat ${r.status}: ${raw.slice(0, 400)}`);
      }
      let data: OllamaChatResponse;
      try {
        data = JSON.parse(raw) as OllamaChatResponse;
      } catch {
        throw new Error("Ollama devolvió respuesta no JSON");
      }
      if (data.error) {
        throw new Error(`Ollama: ${data.error}`);
      }
      const content = data.message?.content?.trim();
      if (!content) {
        throw new Error("Ollama devolvió contenido vacío");
      }
      return content;
    },
  };
}
