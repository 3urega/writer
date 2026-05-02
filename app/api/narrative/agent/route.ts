import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { RunNarrativeAgent } from "@/lib/agent/application/runNarrativeAgent";
import {
  AGENT_ORCHESTRATOR_UNAVAILABLE_MESSAGE,
  selectAgentOrchestratorLlm,
} from "@/lib/agent/infra/selectAgentOrchestratorLlm";
import { narrativeSessionSchema } from "@/lib/story/narrativeSession";

const postBodySchema = z
  .object({
    userMessage: z.string().min(1).max(8000),
    maxSteps: z.number().int().min(1).max(15).optional().default(6),
    session: narrativeSessionSchema,
  })
  .strict();

/**
 * Agente de modo narrativo: orquestador + contexto acotado + herramientas filtradas por intención.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = postBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "cuerpo inválido", details: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const useCase = new RunNarrativeAgent(selectAgentOrchestratorLlm);
    const result = await useCase.execute({
      userMessage: parsed.data.userMessage,
      maxSteps: parsed.data.maxSteps,
      session: parsed.data.session,
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Proyecto no encontrado") {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    if (msg === AGENT_ORCHESTRATOR_UNAVAILABLE_MESSAGE) {
      return NextResponse.json({ error: msg }, { status: 503 });
    }
    console.error("[api/narrative/agent]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
