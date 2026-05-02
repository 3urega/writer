import type { AgentLlmMessage } from "./types";

/**
 * LLM en prosa para el onboarding narrativo (sin JSON obligatorio).
 */
export type NarrativeTextLlm = {
  completeTextMessages(messages: AgentLlmMessage[]): Promise<string>;
};
