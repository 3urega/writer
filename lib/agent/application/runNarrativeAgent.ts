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
  AgentStepTrace,
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
  /** Última fila creada por create_version en esta ejecución, si hubo. */
  lastCreatedVersionId: string | null;
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
    return {
      ...result,
      intent,
      lastCreatedVersionId: extractLastCreatedVersionId(result.steps),
    };
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function extractLastCreatedVersionId(steps: AgentStepTrace[]): string | null {
  for (let i = steps.length - 1; i >= 0; i--) {
    const s = steps[i];
    if (s.toolName !== "create_version" || !s.toolResultSummary?.trim()) {
      continue;
    }
    const summary = s.toolResultSummary.trim();
    try {
      const j = JSON.parse(summary) as { version_id?: string };
      if (j.version_id && UUID_RE.test(j.version_id)) return j.version_id;
    } catch {
      const m = /"version_id"\s*:\s*"([^"]+)"/.exec(summary);
      if (m?.[1] && UUID_RE.test(m[1])) return m[1];
    }
  }
  return null;
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
