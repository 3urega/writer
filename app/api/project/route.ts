import { NextResponse, type NextRequest } from "next/server";

import { projectSchema } from "@/lib/domain/types";
import { createInitialProject } from "@/lib/domain/versioning";
import {
  listProjectSummariesFromPostgres,
  saveProjectToPostgres,
} from "@/lib/storage/postgresProjectStore";
import { z } from "zod";

const DEFAULT_NAME = "Borrador";

const postBodySchema = z
  .object({
    project: projectSchema.optional(),
  })
  .strict();

/**
 * Lista proyectos recientes (servidor). Usado por la home.
 */
export async function GET() {
  try {
    const projects = await listProjectSummariesFromPostgres();
    return NextResponse.json({ projects });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Error al listar proyectos";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Crea un proyecto en Postgres. Sin cuerpo: uno vacío (un capítulo, una versión).
 * Cuerpo `{ "project": ... }` validado: persiste ese grafo (útil para subir un borrador local).
 */
export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    if (text.trim() === "") {
      const { project } = createInitialProject(DEFAULT_NAME);
      await saveProjectToPostgres(project);
      return NextResponse.json({ id: project.id }, { status: 201 });
    }
    let raw: unknown;
    try {
      raw = JSON.parse(text) as unknown;
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
    if (parsed.data.project) {
      await saveProjectToPostgres(parsed.data.project);
      return NextResponse.json(
        { id: parsed.data.project.id },
        { status: 201 }
      );
    }
    const { project } = createInitialProject(DEFAULT_NAME);
    await saveProjectToPostgres(project);
    return NextResponse.json({ id: project.id }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al crear el proyecto";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
