import type { RewriteFragmentInput } from "./openaiRewriteFragment";
import { rewriteFragmentWithOpenAI } from "./openaiRewriteFragment";
import { rewriteFragmentWithOllama } from "./ollamaRewriteFragment";
import { AGENT_ORCHESTRATOR_UNAVAILABLE_MESSAGE } from "./selectAgentOrchestratorLlm";

/**
 * Misma política que el orquestador JSON (dev OpenAI/Ollama, prod Ollama/OpenAI/nada).
 */
export async function rewriteFragmentWithConfiguredProvider(
  input: RewriteFragmentInput
): Promise<string> {
  if (
    process.env.AGENT_USE_STUB === "1" ||
    process.env.AGENT_USE_STUB === "true"
  ) {
    return `[stub] ${input.fragment_text}`;
  }

  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL?.trim();
  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    if (openAiKey) {
      return rewriteFragmentWithOpenAI(input);
    }
    return rewriteFragmentWithOllama(input);
  }

  if (ollamaBaseUrl) {
    return rewriteFragmentWithOllama(input);
  }
  if (openAiKey) {
    return rewriteFragmentWithOpenAI(input);
  }

  throw new Error(AGENT_ORCHESTRATOR_UNAVAILABLE_MESSAGE);
}
