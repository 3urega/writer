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

/** Evita dos `saveProjectToPostgres` concurrentes para el mismo id (bloqueos y timeouts). */
const projectSaveTail = new Map<string, Promise<void>>();

function runSaveSerialized<T>(projectId: string, fn: () => Promise<T>): Promise<T> {
  const prev = projectSaveTail.get(projectId) ?? Promise.resolve();
  const run = prev.then(() => fn());
  projectSaveTail.set(
    projectId,
    run.then(
      () => undefined,
      () => undefined
    )
  );
  return run;
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
      ? undefined
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
 *
 * Usa `$transaction([...])` (batch) en lugar de callback interactivo: con
 * Prisma Accelerate / pools el modo interactivo retiene conexión entre awaits
 * y puede agotar `maxWait` (~20s) o fallar con 500.
 */
export async function saveProjectToPostgres(project: Project): Promise<void> {
  const normalized = normalizeProject(project);
  return runSaveSerialized(normalized.id, () => saveProjectToPostgresCore(normalized));
}

async function saveProjectToPostgresCore(normalized: Project): Promise<void> {
  const prisma = getPrismaClient();
  /**
   * Sin `findUnique` previo: evita una ronda de red y el timeout aislado
   * ("Operation has timed out") bajo carga. `deleteMany` con el mismo `id` borra
   * 0 o 1 fila y, por cascada, el grafo existente (incl. knowledge_documents/chunks;
   * puede ser costoso con muchos PDF indexados).
   */
  const steps: Prisma.PrismaPromise<unknown>[] = [
    // Misma transacción: evita que `statement_timeout` del servidor corte un CASCADE largo
    prisma.$executeRaw`SELECT set_config('statement_timeout', '5min', true)`,
    prisma.project.deleteMany({ where: { id: normalized.id } }),
  ];
  steps.push(
    prisma.project.create({
      data: {
        id: normalized.id,
        name: normalized.name,
        chapters: { create: normalized.chapters.map(chapterInput) },
      },
    })
  );
  for (const ch of normalized.chapters) {
    if (ch.mainVersionId) {
      steps.push(
        prisma.chapter.update({
          where: { id: ch.id },
          data: { mainVersionId: ch.mainVersionId },
        })
      );
    }
  }

  await prisma.$transaction(steps, {
    maxWait: 60_000,
    timeout: 300_000,
  });
}
