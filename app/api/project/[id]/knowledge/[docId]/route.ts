import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getPrismaClient } from "@/lib/db/prisma";

const paramsSchema = z.object({
  id: z.string().uuid(),
  docId: z.string().uuid(),
});

const patchBodySchema = z
  .object({
    title: z.string().min(1).max(500).optional(),
    activeForAgent: z.boolean().optional(),
  })
  .strict();

type RouteContext = { params: Promise<{ id: string; docId: string }> };

/**
 * Actualiza título y/o uso para el agente. `activeForAgent` solo aplica si status es `ready`.
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  const raw = await context.params;
  const params = paramsSchema.safeParse(raw);
  if (!params.success) {
    return NextResponse.json({ error: "parámetros inválidos" }, { status: 400 });
  }
  const { id: projectId, docId } = params.data;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = patchBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "cuerpo inválido", details: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const existing = await getPrismaClient().knowledgeDocument.findFirst({
      where: { id: docId, projectId },
    });
    if (!existing) {
      return NextResponse.json({ error: "no encontrado" }, { status: 404 });
    }

    let activeForAgent = existing.activeForAgent;
    if (parsed.data.activeForAgent !== undefined) {
      if (parsed.data.activeForAgent && existing.status !== "ready") {
        return NextResponse.json(
          {
            error:
              "Solo se puede activar para el agente cuando el documento está listo (índice completado).",
          },
          { status: 409 }
        );
      }
      activeForAgent = parsed.data.activeForAgent;
    }

    const updated = await getPrismaClient().knowledgeDocument.update({
      where: { id: docId },
      data: {
        ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
        activeForAgent,
      },
    });

    return NextResponse.json({
      document: {
        id: updated.id,
        title: updated.title,
        sourceFilename: updated.sourceFilename,
        status: updated.status,
        errorMessage: updated.errorMessage,
        activeForAgent: updated.activeForAgent,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al actualizar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
