import { v4 as uuidv4 } from "uuid";

import type { Chapter, Project, Version, VersionCreatedBy } from "./types";

function nowIso(): string {
  return new Date().toISOString();
}

export function createVersionSnapshot(input: {
  content: string;
  parentVersionId: string | null;
  createdBy: VersionCreatedBy;
}): Version {
  return {
    id: uuidv4(),
    content: input.content,
    parentVersionId: input.parentVersionId,
    createdBy: input.createdBy,
    createdAt: nowIso(),
  };
}

/**
 * Crea un proyecto con un capítulo y una versión inicial vacía.
 */
export function createInitialProject(name: string): {
  project: Project;
  activeChapterId: string;
  activeVersionId: string;
} {
  const projectId = uuidv4();
  const chapterId = uuidv4();
  const firstVersion = createVersionSnapshot({
    content: "",
    parentVersionId: null,
    createdBy: "user",
  });

  const chapter: Chapter = {
    id: chapterId,
    order: 0,
    versions: [firstVersion],
  };

  const project: Project = {
    id: projectId,
    name,
    chapters: [chapter],
  };

  return {
    project,
    activeChapterId: chapterId,
    activeVersionId: firstVersion.id,
  };
}

export function findChapter(project: Project, chapterId: string): Chapter | undefined {
  return project.chapters.find((c) => c.id === chapterId);
}

export function findVersion(chapter: Chapter, versionId: string): Version | undefined {
  return chapter.versions.find((v) => v.id === versionId);
}

/**
 * Añade una versión inmutable y devuelve el capítulo y el id de la nueva versión.
 */
export function saveNewVersionInChapter(
  chapter: Chapter,
  newVersion: Version
): { chapter: Chapter; newVersionId: string } {
  return {
    chapter: {
      ...chapter,
      versions: [...chapter.versions, newVersion],
    },
    newVersionId: newVersion.id,
  };
}

/**
 * Sustituye un capítulo en el proyecto.
 */
export function replaceChapter(project: Project, nextChapter: Chapter): Project {
  return {
    ...project,
    chapters: project.chapters.map((c) => (c.id === nextChapter.id ? nextChapter : c)),
  };
}

/**
 * Ajusta un rango de selección a longitud de `content` (p. ej. tras cambiar de versión).
 */
export function clampSelectionRange(
  start: number,
  end: number,
  contentLength: number
): { start: number; end: number } {
  const s = Math.max(0, Math.min(start, contentLength));
  const e = Math.max(0, Math.min(end, contentLength));
  if (e < s) return { start: s, end: s };
  return { start: s, end: e };
}
