import { buildNarrativeDiscoverySystemPrompt } from "@/lib/agent/application/narrativeDiscoverySystemPrompt";
import type { NarrativeTextLlm } from "@/lib/agent/ports/narrativeTextLlm";
import type { AgentLlmMessage } from "@/lib/agent/ports/types";

export type DiscoveryClientMessage = {
  role: "user" | "assistant";
  content: string;
};

export type RunNarrativeDiscoveryTurnInput = {
  messages: DiscoveryClientMessage[];
};

export type RunNarrativeDiscoveryTurnOutput = {
  reply: string;
};

/**
 * Un turno del compañero narrativo (onboarding): system prompt fijo + historial user/assistant.
 */
export class RunNarrativeDiscoveryTurn {
  constructor(private readonly llm: NarrativeTextLlm) {}

  async execute(
    input: RunNarrativeDiscoveryTurnInput
  ): Promise<RunNarrativeDiscoveryTurnOutput> {
    const systemText = buildNarrativeDiscoverySystemPrompt();
    const thread: AgentLlmMessage[] = [
      { role: "system", content: systemText },
      ...input.messages,
    ];
    const reply = await this.llm.completeTextMessages(thread);
    return { reply };
  }
}
