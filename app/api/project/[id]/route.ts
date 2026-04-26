import { NextResponse, type NextRequest } from "next/server";

import { projectSchema, type Project } from "@/lib/domain/types";
import {
  loadProjectFromPostgres,
  saveProjectToPostgres,
} from "@/lib/storage/postgresProjectStore";
import { z } from "zod";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const putBodySchema = z.object({
  project: projectSchema,
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id: rawId } = await context.params;
  const params = paramsSchema.safeParse({ id: rawId });
  if (!params.success) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }
  const { id } = params.data;
  try {
    const project = await loadProjectFromPostgres(id);
    if (!project) {
      return NextResponse.json({ error: "no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ project } satisfies { project: Project });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al cargar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const { id: rawId } = await context.params;
  const params = paramsSchema.safeParse({ id: rawId });
  if (!params.success) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }
  const { id } = params.data;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = putBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "cuerpo inválido", details: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }
  if (parsed.data.project.id !== id) {
    return NextResponse.json(
      { error: "el id del cuerpo no coincide con la ruta" },
      { status: 400 }
    );
  }
  try {
    await saveProjectToPostgres(parsed.data.project);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al guardar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
