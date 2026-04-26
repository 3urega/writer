import { getPrismaClient } from "../db/prisma";
import { normalizeProject } from "../domain/versioning";
import type { Branch, Chapter, Project, Version, VersionCreatedBy } from "../domain/types";
import { Prisma } from "../generated/prisma/client";

function mapVersion(v: {
  id: string;
  content: string;
  parentVersionId: string | null;
  branchId: string | null;
  metadata: Prisma.JsonValue;
  createdBy: string;
  createdAt: Date;
}): Version {
  const createdBy = v.createdBy as VersionCreatedBy;
  return {
    id: v.id,
    content: v.content,
    parentVersionId: v.parentVersionId,
    branchId: v.branchId,
    metadata: v.metadata == null
      ? null
      : (typeof v.metadata === "object" && v.metadata != null
          ? (v.metadata as Version["metadata"])
          : null),
    createdBy,
    createdAt: v.createdAt.toISOString(),
  };
}

function mapBranch(
  b: {
    id: string;
    chapterId: string;
    slug: string;
    name: string;
    description: string | null;
    createdFromVersionId: string | null;
    status: string;
    createdAt: Date;
  }
): Branch {
  return {
    id: b.id,
    chapterId: b.chapterId,
    slug: b.slug,
    name: b.name,
    description: b.description,
    createdFromVersionId: b.createdFromVersionId,
    status: b.status as Branch["status"],
    createdAt: b.createdAt.toISOString(),
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
        mainVersionId: ch.mainVersionId,
        branches: ch.branches
          .slice()
          .sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )
          .map(mapBranch),
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
      branches: true,
    },
  },
} satisfies Prisma.ProjectInclude;

type ProjectWithGraph = Prisma.ProjectGetPayload<{
  include: typeof projectInclude;
}>;

/**
 * Carga un proyecto con capítulos, ramas y versiones, ordenado por `order` y `createdAt`.
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
  branchId: v.branchId,
  metadata:
    v.metadata == null
      ? Prisma.JsonNull
      : (v.metadata as Prisma.InputJsonValue),
});

const branchInput = (b: Branch) => ({
  id: b.id,
  slug: b.slug,
  name: b.name,
  description: b.description,
  createdFromVersionId: b.createdFromVersionId,
  status: b.status,
  createdAt: new Date(b.createdAt),
});

const chapterInput = (ch: Chapter) => ({
  id: ch.id,
  order: ch.order,
  branches: { create: ch.branches.map(branchInput) },
  versions: { create: ch.versions.map(versionInput) },
});

/**
 * Sustituye en bloque un proyecto: borra y vuelve a crear el `Project` y su grafo
 * (transaccional). Adecuado para alinear con el JSON del dominio.
 */
export async function saveProjectToPostgres(project: Project): Promise<void> {
  const normalized = normalizeProject(project);
  await getPrismaClient().$transaction(async (tx) => {
    const existing = await tx.project.findUnique({ where: { id: normalized.id } });
    if (existing) {
      await tx.project.delete({ where: { id: normalized.id } });
    }
    await tx.project.create({
      data: {
        id: normalized.id,
        name: normalized.name,
        chapters: { create: normalized.chapters.map(chapterInput) },
      },
    });
    for (const ch of normalized.chapters) {
      if (ch.mainVersionId) {
        await tx.chapter.update({
          where: { id: ch.id },
          data: { mainVersionId: ch.mainVersionId },
        });
      }
    }
  });
}
