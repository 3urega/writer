import type { NarrativeSession } from "@/lib/story/narrativeSession";

export type NarrativeAgentApiResult = {
  reply: string | null;
  steps: Array<{
    thought?: string;
    toolName?: string;
    toolArguments?: Record<string, unknown>;
    toolResultSummary?: string;
  }>;
  stoppedReason: "final" | "max_steps";
  intent: string;
};

export async function runNarrativeAgentRequest(input: {
  userMessage: string;
  session: NarrativeSession;
  maxSteps?: number;
}): Promise<NarrativeAgentApiResult> {
  const r = await fetch("/api/narrative/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userMessage: input.userMessage,
      maxSteps: input.maxSteps ?? 6,
      session: input.session,
    }),
  });
  const data = (await r.json().catch(() => ({}))) as NarrativeAgentApiResult & {
    error?: string;
  };
  if (!r.ok) {
    throw new Error(data.error ?? `Error ${r.status}`);
  }
  return data as NarrativeAgentApiResult;
}
