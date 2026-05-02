import type { NarrativeTextLlm } from "../ports/narrativeTextLlm";

import { createOllamaTextLlm } from "./ollamaTextLlm";
import { createOpenAiTextLlm } from "./openaiTextLlm";
import { createStubNarrativeTextLlm } from "./stubNarrativeTextLlm";

export const NARRATIVE_DISCOVERY_UNAVAILABLE_MESSAGE =
  "No hay proveedor LLM para el compañero narrativo: en producción define OLLAMA_BASE_URL (Ollama) u OPENAI_API_KEY.";

/**
 * Misma política que selectAgentOrchestratorLlm: dev → OpenAI si hay key, si no Ollama;
 * prod → Ollama si hay base URL, si no OpenAI.
 */
export function selectNarrativeDiscoveryLlm(): NarrativeTextLlm {
  if (
    process.env.AGENT_USE_STUB === "1" ||
    process.env.AGENT_USE_STUB === "true"
  ) {
    return createStubNarrativeTextLlm();
  }

  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL?.trim();
  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    if (openAiKey) {
      return createOpenAiTextLlm();
    }
    return createOllamaTextLlm();
  }

  if (ollamaBaseUrl) {
    return createOllamaTextLlm({ baseUrl: ollamaBaseUrl });
  }
  if (openAiKey) {
    return createOpenAiTextLlm();
  }

  throw new Error(NARRATIVE_DISCOVERY_UNAVAILABLE_MESSAGE);
}
