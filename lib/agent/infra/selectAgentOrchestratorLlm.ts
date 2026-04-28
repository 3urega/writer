import type { LlmClient } from "../ports/llmClient";

import { createOllamaJsonLlm } from "./ollamaChatJsonLlm";
import { createOpenAiJsonLlm } from "./openaiJsonLlm";
import { createStubWritingAgentLlm } from "./stubWritingAgentLlm";

export const AGENT_ORCHESTRATOR_UNAVAILABLE_MESSAGE =
  "No hay proveedor LLM para el agente: en producción define OLLAMA_BASE_URL (Ollama) u OPENAI_API_KEY.";

/**
 * Dev: si existe `OPENAI_API_KEY` → OpenAI; si no → Ollama (local por defecto).
 * Producción: si existe `OLLAMA_BASE_URL` → Ollama; si no y hay `OPENAI_API_KEY` → OpenAI;
 * si no hay ninguno → error (sin LLM silencioso).
 * `AGENT_USE_STUB=true` fuerza stub (tests).
 */
export function selectAgentOrchestratorLlm(projectId: string): LlmClient {
  if (
    process.env.AGENT_USE_STUB === "1" ||
    process.env.AGENT_USE_STUB === "true"
  ) {
    return createStubWritingAgentLlm(projectId);
  }

  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL?.trim();
  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    if (openAiKey) {
      return createOpenAiJsonLlm();
    }
    return createOllamaJsonLlm();
  }

  if (ollamaBaseUrl) {
    return createOllamaJsonLlm();
  }
  if (openAiKey) {
    return createOpenAiJsonLlm();
  }

  throw new Error(AGENT_ORCHESTRATOR_UNAVAILABLE_MESSAGE);
}
