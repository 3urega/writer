import { z } from "zod";

import type { AgentDecision } from "../ports/types";

/**
 * Interpreta JSON del LLM como decisión (`final` tiene prioridad si viene con `action`).
 */
export function parseAgentDecision(raw: string): AgentDecision | null {
  let data: unknown;
  try {
    data = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  const base = z
    .object({
      thought: z.string().optional(),
      action: z
        .object({
          name: z.string(),
          arguments: z.record(z.string(), z.unknown()),
        })
        .optional(),
      final: z.string().optional(),
    })
    .safeParse(data);
  if (!base.success) {
    return null;
  }
  const d = base.data;
  if (d.final !== undefined && d.final.trim() !== "") {
    return { kind: "final", thought: d.thought, final: d.final };
  }
  if (d.action != null) {
    return {
      kind: "action",
      thought: d.thought,
      action: {
        name: d.action.name,
        arguments: d.action.arguments,
      },
    };
  }
  return null;
}
