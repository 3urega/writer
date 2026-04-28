/** API pública del módulo agente Fase 1 (exports usados desde fuera de `lib/agent/`). */
export { runWritingAgent } from "./application/runWritingAgent";
export type { RunWritingAgentDeps } from "./application/runWritingAgent";
export type {
  AgentEditorContextPayload,
  AgentLlmMessage,
  AgentStepTrace,
  RunWritingAgentInput,
  RunWritingAgentResult,
} from "./ports/types";
