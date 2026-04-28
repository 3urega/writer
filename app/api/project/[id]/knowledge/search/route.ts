import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getPrismaClient } from "@/lib/db/prisma";
import { searchKnowledgeForAgent } from "@/lib/knowledge/search";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const querySchema = z.object({
  q: z.string().min(1).max(2000),
  topK: z.coerce.number().int().min(1).max(20).optional().default(5),
});

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Prueba de búsqueda semántica solo sobre documentos activos y listos.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const { id: rawId } = await context.params;
  const params = paramsSchema.safeParse({ id: rawId });
  if (!params.success) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }
  const { id: projectId } = params.data;

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    q: url.searchParams.get("q") ?? "",
    topK: url.searchParams.get("topK") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "query inválida", details: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const project = await getPrismaClient().project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: "no encontrado" }, { status: 404 });
    }

    const hits = await searchKnowledgeForAgent(
      projectId,
      parsed.data.q,
      parsed.data.topK
    );
    return NextResponse.json({ hits });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error en búsqueda";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
