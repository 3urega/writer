/**
 * Puertos del agente de escritura (Fase 1).
 */

export type AgentLlmRole = "system" | "user" | "assistant";

export type AgentLlmMessage = {
  role: AgentLlmRole;
  content: string;
};

/** Decisión del modelo: respuesta final al usuario o una llamada a herramienta. */
export type AgentDecision =
  | {
      kind: "final";
      thought?: string | undefined;
      final: string;
    }
  | {
      kind: "action";
      thought?: string | undefined;
      action: { name: string; arguments: Record<string, unknown> };
    };

export type AgentEditorContextPayload = {
  versionId: string;
  startIndex: number;
  endIndex: number;
  /** Texto completo de la versión enviado por el cliente (evita leer BD si el borrador no está persistido). */
  versionText?: string | undefined;
};

export type AgentToolContext = {
  projectId: string;
  editorContext?: AgentEditorContextPayload | undefined;
};

export type AgentStepTrace = {
  thought?: string | undefined;
  toolName?: string | undefined;
  toolArguments?: Record<string, unknown> | undefined;
  toolResultSummary?: string | undefined;
};

export type RunWritingAgentInput = {
  projectId: string;
  userMessage: string;
  maxSteps: number;
  /** Opcional: ancla `get_context` al fragmento del editor (cliente o BD). */
  editorContext?: AgentEditorContextPayload | undefined;
};

export type RunWritingAgentResult = {
  reply: string | null;
  steps: AgentStepTrace[];
  stoppedReason: "final" | "max_steps";
};
