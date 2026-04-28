import { getPrismaClient } from "@/lib/db/prisma";

import { parseAgentDecision } from "./parseAgentDecision";
import { buildWritingAgentSystemPrompt } from "./writingAgentSystemPrompt";
import type { LlmClient } from "../ports/llmClient";
import type { AgentToolRegistry } from "../ports/agentTool";
import type {
  AgentLlmMessage,
  AgentStepTrace,
  RunWritingAgentInput,
  RunWritingAgentResult,
} from "../ports/types";

export type RunWritingAgentDeps = {
  llm: LlmClient;
  registry: AgentToolRegistry;
};

function summarizeToolResult(result: unknown): string {
  try {
    const s = JSON.stringify(result);
    return s.length > 800 ? `${s.slice(0, 800)}…` : s;
  } catch {
    return "(resultado no serializable)";
  }
}

/**
 * Bucle del agente: registro de herramientas (RAG, contexto, estilo, reescritura, evaluación, diff, versionado, listado).
 */
export async function runWritingAgent(
  input: RunWritingAgentInput,
  deps: RunWritingAgentDeps
): Promise<RunWritingAgentResult> {
  const project = await getPrismaClient().project.findUnique({
    where: { id: input.projectId },
    select: { id: true },
  });
  if (!project) {
    throw new Error("Proyecto no encontrado");
  }

  const systemPrompt = buildWritingAgentSystemPrompt(
    input.projectId,
    deps.registry
  );

  const messages: AgentLlmMessage[] = [
    { role: "user", content: input.userMessage },
  ];
  const steps: AgentStepTrace[] = [];

  for (let i = 0; i < input.maxSteps; i++) {
    let raw = await deps.llm.completeJsonMessages([
      { role: "system", content: systemPrompt },
      ...messages,
    ]);

    let decision = parseAgentDecision(raw);
    if (decision == null) {
      raw = await deps.llm.completeJsonMessages([
        { role: "system", content: systemPrompt },
        ...messages,
        { role: "assistant", content: raw.slice(0, 4000) },
        {
          role: "user",
          content:
            "Tu respuesta anterior no era JSON válido con \"final\" (string) o \"action\" (objeto). Devuelve únicamente un objeto JSON, sin bloques markdown.",
        },
      ]);
      decision = parseAgentDecision(raw);
    }
    if (decision == null) {
      messages.push({
        role: "assistant",
        content: JSON.stringify({
          error:
            "El modelo devolvió JSON inválido. Se esperaba { final } o { action }.",
          rawSnippet: raw.slice(0, 400),
        }),
      });
      continue;
    }

    if (decision.kind === "final") {
      return {
        reply: decision.final,
        steps,
        stoppedReason: "final",
      };
    }

    const tool = deps.registry.get(decision.action.name);
    let toolOut: unknown;
    if (!tool) {
      toolOut = { error: `Herramienta desconocida: ${decision.action.name}` };
      steps.push({
        thought: decision.thought,
        toolName: decision.action.name,
        toolArguments: decision.action.arguments,
        toolResultSummary: summarizeToolResult(toolOut),
      });
      messages.push({
        role: "assistant",
        content: JSON.stringify({ thought: decision.thought, tool_result: toolOut }),
      });
      continue;
    }

    try {
      toolOut = await tool.execute(decision.action.arguments, {
        projectId: input.projectId,
        editorContext: input.editorContext,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toolOut = { error: msg };
    }

    steps.push({
      thought: decision.thought,
      toolName: tool.name,
      toolArguments: decision.action.arguments,
      toolResultSummary: summarizeToolResult(toolOut),
    });

    messages.push({
      role: "assistant",
      content: JSON.stringify({
        thought: decision.thought,
        tool_result: toolOut,
      }),
    });
  }

  return {
    reply: null,
    steps,
    stoppedReason: "max_steps",
  };
}
