import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { rewriteEditorFragment } from "@/lib/agent/application/rewriteEditorFragment";
import { AGENT_ORCHESTRATOR_UNAVAILABLE_MESSAGE } from "@/lib/agent/infra/selectAgentOrchestratorLlm";

const editorContextSchema = z
  .object({
    versionId: z.string().uuid(),
    startIndex: z.number().int().min(0),
    endIndex: z.number().int().min(0),
    versionText: z.string(),
  })
  .strict()
  .refine((x) => x.endIndex > x.startIndex, {
    message: "endIndex debe ser > startIndex",
  })
  .refine((x) => x.endIndex <= x.versionText.length, {
    message: "endIndex excede la longitud de versionText",
  });

const postBodySchema = z
  .object({
    projectId: z.string().uuid(),
    instructions: z.string().min(1).max(4000),
    editorContext: editorContextSchema,
  })
  .strict();

/**
 * Reescritura directa de un fragmento seleccionado (sin orquestador JSON).
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
    const result = await rewriteEditorFragment(parsed.data);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Proyecto no encontrado") {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    if (msg === AGENT_ORCHESTRATOR_UNAVAILABLE_MESSAGE) {
      return NextResponse.json({ error: msg }, { status: 503 });
    }
    console.error("[api/agent/rewrite-fragment]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
