import { buildNarrativeUserMessage } from "@/lib/agent/application/narrativeContextBuilder";
import type { NarrativeIntent } from "@/lib/agent/application/narrativeIntent";
import {
  allowedToolNamesForIntent,
  detectNarrativeIntent,
} from "@/lib/agent/application/narrativeIntent";
import { runWritingAgent } from "@/lib/agent/application/runWritingAgent";
import type { LlmClient } from "@/lib/agent/ports/llmClient";
import type {
  AgentEditorContextPayload,
  RunWritingAgentResult,
} from "@/lib/agent/ports/types";
import { createDefaultToolRegistry } from "@/lib/agent/tools/registry";
import { filterToolRegistry } from "@/lib/agent/tools/filterToolRegistry";
import type { NarrativeSession } from "@/lib/story/narrativeSession";

export type RunNarrativeAgentInput = {
  userMessage: string;
  maxSteps?: number;
  session: NarrativeSession;
};

export type RunNarrativeAgentOutput = RunWritingAgentResult & {
  intent: NarrativeIntent;
};

/**
 * Caso de uso: orquestación narrativa (contexto acotado + herramientas filtradas + `runWritingAgent`).
 */
export class RunNarrativeAgent {
  constructor(
    private readonly resolveLlm: (projectId: string) => LlmClient
  ) {}

  async execute(input: RunNarrativeAgentInput): Promise<RunNarrativeAgentOutput> {
    const { intent } = detectNarrativeIntent(input.userMessage);
    const allowed = allowedToolNamesForIntent(intent);
    const registry = filterToolRegistry(
      createDefaultToolRegistry(),
      allowed
    );
    const { userMessage } = buildNarrativeUserMessage({
      rawUserMessage: input.userMessage,
      session: input.session,
      intent,
    });

    const editorContext = buildEditorContext(input.session);

    const llm = this.resolveLlm(input.session.projectId);
    const result = await runWritingAgent(
      {
        projectId: input.session.projectId,
        userMessage,
        maxSteps: input.maxSteps ?? 6,
        editorContext,
      },
      { llm, registry }
    );
    return { ...result, intent };
  }
}

function buildEditorContext(
  session: NarrativeSession
): AgentEditorContextPayload | undefined {
  const text = session.chapterText ?? "";
  const v = session.versionId;
  if (!v || !text.length) return undefined;

  const ss = session.selectionStart;
  const se = session.selectionEnd;
  if (ss !== undefined && se !== undefined && se > ss) {
    return {
      versionId: v,
      startIndex: ss,
      endIndex: se,
      versionText: text,
    };
  }

  const end = Math.min(text.length, Math.max(1, 1800));
  return {
    versionId: v,
    startIndex: 0,
    endIndex: end,
    versionText: text,
  };
}
