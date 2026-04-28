import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { runWritingAgent } from "@/lib/agent/application/runWritingAgent";
import {
  AGENT_ORCHESTRATOR_UNAVAILABLE_MESSAGE,
  selectAgentOrchestratorLlm,
} from "@/lib/agent/infra/selectAgentOrchestratorLlm";
import { createDefaultToolRegistry } from "@/lib/agent/tools/registry";

const editorContextSchema = z
  .object({
    versionId: z.string().uuid(),
    startIndex: z.number().int().min(0),
    endIndex: z.number().int().min(0),
    versionText: z.string().optional(),
  })
  .strict()
  .refine((x) => x.endIndex >= x.startIndex, {
    message: "endIndex debe ser >= startIndex",
  });

const postBodySchema = z
  .object({
    projectId: z.string().uuid(),
    message: z.string().min(1).max(8000),
    maxSteps: z.number().int().min(1).max(15).optional().default(5),
    editorContext: editorContextSchema.optional(),
  })
  .strict();



/**
 * Agente de escritura: tools `search_knowledge`, `get_context`, `rewrite_fragment`.
 * Orquestador: ver `selectAgentOrchestratorLlm` (dev/prod/OpenAI/Ollama).
 * `rewrite_fragment` puede seguir usando OpenAI vía herramienta si hay clave.
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
    const llm = selectAgentOrchestratorLlm(parsed.data.projectId);

    const ec = parsed.data.editorContext;

    const result = await runWritingAgent(
      {
        projectId: parsed.data.projectId,
        userMessage: parsed.data.message,
        maxSteps: parsed.data.maxSteps,
        editorContext:
          ec === undefined ?
            undefined
          : {
              versionId: ec.versionId,
              startIndex: ec.startIndex,
              endIndex: ec.endIndex,
              versionText: ec.versionText,
            },
      },
      { llm, registry: createDefaultToolRegistry() }
    );
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Proyecto no encontrado") {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    if (msg === AGENT_ORCHESTRATOR_UNAVAILABLE_MESSAGE) {
      return NextResponse.json({ error: msg }, { status: 503 });
    }
    console.error("[api/agent]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
