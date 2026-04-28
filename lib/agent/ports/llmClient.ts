import type { AgentLlmMessage } from "./types";

export type LlmClient = {
  /** Debe devolver JSON parseable compatible con AgentDecision (`final` o `action`). */
  completeJsonMessages(messages: AgentLlmMessage[]): Promise<string>;
};
