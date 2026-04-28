import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getPrismaClient } from "@/lib/db/prisma";
import { ingestPdfToKnowledge } from "@/lib/knowledge/ingestDocument";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

type RouteContext = { params: Promise<{ id: string }> };

function mapDoc(d: {
  id: string;
  title: string;
  sourceFilename: string;
  status: string;
  errorMessage: string | null;
  activeForAgent: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: d.id,
    title: d.title,
    sourceFilename: d.sourceFilename,
    status: d.status,
    errorMessage: d.errorMessage,
    activeForAgent: d.activeForAgent,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

/**
 * Lista la biblioteca de conocimiento del proyecto.
 */
export async function GET(_req: NextRequest, context: RouteContext) {
  const { id: rawId } = await context.params;
  const params = paramsSchema.safeParse({ id: rawId });
  if (!params.success) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }
  const { id: projectId } = params.data;
  try {
    const project = await getPrismaClient().project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: "no encontrado" }, { status: 404 });
    }
    const docs = await getPrismaClient().knowledgeDocument.findMany({
      where: { projectId },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({
      documents: docs.map(mapDoc),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al listar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Sube un PDF e inicia ingesta (embeddings vía Ollama en servidor).
 * FormData: `file` (PDF), opcional `title`.
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const { id: rawId } = await context.params;
  const params = paramsSchema.safeParse({ id: rawId });
  if (!params.success) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }
  const { id: projectId } = params.data;
  try {
    const project = await getPrismaClient().project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: "no encontrado" }, { status: 404 });
    }

    const ct = req.headers.get("content-type") ?? "";
    if (!ct.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Se esperaba multipart/form-data con el campo file" },
        { status: 400 }
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    const titleRaw = form.get("title");
    const title =
      typeof titleRaw === "string" && titleRaw.trim()
        ? titleRaw.trim()
        : undefined;

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Falta el archivo PDF en el campo file" },
        { status: 400 }
      );
    }
    const name = (file.name || "").toLowerCase();
    const looksPdf =
      name.endsWith(".pdf") ||
      file.type === "application/pdf" ||
      file.type === "application/x-pdf";
    if (!looksPdf) {
      return NextResponse.json(
        { error: "Solo se admiten archivos PDF (.pdf)" },
        { status: 400 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const sourceFilename = file.name || "documento.pdf";

    const { documentId } = await ingestPdfToKnowledge({
      projectId,
      buffer: buf,
      sourceFilename,
      titleOverride: title,
    });

    const doc = await getPrismaClient().knowledgeDocument.findUniqueOrThrow({
      where: { id: documentId },
    });

    return NextResponse.json(
      { document: mapDoc(doc) },
      { status: doc.status === "error" ? 422 : 201 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al importar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
