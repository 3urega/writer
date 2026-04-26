import { getPrismaClient } from "../db/prisma";
import type { Chapter, Project, Version, VersionCreatedBy } from "../domain/types";
import { Prisma } from "../generated/prisma/client";

function mapVersion(v: {
  id: string;
  content: string;
  parentVersionId: string | null;
  createdBy: string;
  createdAt: Date;
}): Version {
  const createdBy = v.createdBy as VersionCreatedBy;
  return {
    id: v.id,
    content: v.content,
    parentVersionId: v.parentVersionId,
    createdBy,
    createdAt: v.createdAt.toISOString(),
  };
}

function mapRowToProject(p: ProjectWithGraph): Project {
  return {
    id: p.id,
    name: p.name,
    chapters: p.chapters
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((ch) => ({
        id: ch.id,
        order: ch.order,
        versions: ch.versions
          .slice()
          .sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )
          .map(mapVersion),
      })),
  };
}

const projectInclude = {
  chapters: {
    include: {
      versions: true,
    },
  },
} satisfies Prisma.ProjectInclude;

type ProjectWithGraph = Prisma.ProjectGetPayload<{
  include: typeof projectInclude;
}>;

/**
 * Carga un proyecto con capítulos y versiones, ordenado por `order` y `createdAt`.
 * Solo para uso en servidor (API, Server Actions) con `DATABASE_URL`.
 */
export async function loadProjectFromPostgres(
  id: string
): Promise<Project | null> {
  const row = await getPrismaClient().project.findUnique({
    where: { id },
    include: projectInclude,
  });
  if (!row) return null;
  return mapRowToProject(row);
}

/** Devuelve el primer proyecto (por `created_at`), o null. */
export async function loadFirstProjectFromPostgres(): Promise<Project | null> {
  const row = await getPrismaClient().project.findFirst({
    orderBy: { createdAt: "asc" },
    include: projectInclude,
  });
  if (!row) return null;
  return mapRowToProject(row);
}

const versionInput = (v: Version) => ({
  id: v.id,
  content: v.content,
  parentVersionId: v.parentVersionId,
  createdBy: v.createdBy,
  createdAt: new Date(v.createdAt),
});

const chapterInput = (ch: Chapter) => ({
  id: ch.id,
  order: ch.order,
  versions: { create: ch.versions.map(versionInput) },
});

/**
 * Sustituye en bloque un proyecto: borra y vuelve a crear el `Project` y su grafo
 * (transaccional). Adecuado para alinear con el JSON del dominio.
 */
export async function saveProjectToPostgres(project: Project): Promise<void> {
  await getPrismaClient().$transaction(async (tx) => {
    const existing = await tx.project.findUnique({ where: { id: project.id } });
    if (existing) {
      await tx.project.delete({ where: { id: project.id } });
    }
    await tx.project.create({
      data: {
        id: project.id,
        name: project.name,
        chapters: { create: project.chapters.map(chapterInput) },
      },
    });
  });
}
