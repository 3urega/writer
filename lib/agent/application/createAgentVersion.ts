import type { Project, VersionMetadata } from "@/lib/domain/types";
import {
  createVersionSnapshot,
  findChapter,
  findMainBranchForChapter,
  findVersion,
  replaceChapter,
  saveNewVersionInChapter,
} from "@/lib/domain/versioning";
import {
  loadProjectFromPostgres,
  saveProjectToPostgres,
} from "@/lib/storage/postgresProjectStore";

export type CreateAgentVersionInput = {
  projectId: string;
  chapterId: string;
  baseVersionId: string;
  newContent: string;
  /** Se fusiona en `Version.metadata`. */
  metadata?: { source?: string; task?: string } & Record<string, unknown>;
};

export type CreateAgentVersionResult = {
  project: Project;
  versionId: string;
};

/**
 * Añade una versión hija en el capítulo y persiste el proyecto en Postgres.
 * No cambia `mainVersionId` (el usuario/el editor eligen la versión oficial).
 */
export async function createAgentVersion(
  input: CreateAgentVersionInput
): Promise<CreateAgentVersionResult> {
  const project = await loadProjectFromPostgres(input.projectId);
  if (!project) {
    throw new Error("Proyecto no encontrado");
  }
  const chapter = findChapter(project, input.chapterId);
  if (!chapter) {
    throw new Error("Capítulo no encontrado");
  }
  const base = findVersion(chapter, input.baseVersionId);
  if (!base) {
    throw new Error("Versión base no encontrada en el capítulo");
  }

  const mergedMeta: VersionMetadata = {
    ...(input.metadata != null ? (input.metadata as VersionMetadata) : {}),
    aiGenerated: true,
  };

  const mainBr = findMainBranchForChapter(chapter);
  const branchId = base.branchId ?? mainBr?.id ?? null;

  const snapshot = createVersionSnapshot({
    content: input.newContent,
    parentVersionId: base.id,
    createdBy: "agent",
    branchId,
    metadata: mergedMeta,
  });

  const { chapter: nextChapter } = saveNewVersionInChapter(chapter, snapshot);
  const updated = replaceChapter(project, nextChapter);

  await saveProjectToPostgres(updated);

  return { project: updated, versionId: snapshot.id };
}
