import { v4 as uuidv4 } from "uuid";

import type {
  Branch,
  Chapter,
  Project,
  Version,
  VersionCreatedBy,
  VersionMetadata,
} from "./types";
import { projectSchema, versionSchema, chapterSchema } from "./types";

function nowIso(): string {
  return new Date().toISOString();
}

const MAIN_SLUG = "main";
const MAIN_BRANCH_NAME = "Línea principal";

export function createVersionSnapshot(input: {
  content: string;
  parentVersionId: string | null;
  createdBy: VersionCreatedBy;
  branchId?: string | null;
  metadata?: VersionMetadata | null;
}): Version {
  return {
    id: uuidv4(),
    content: input.content,
    parentVersionId: input.parentVersionId,
    branchId: input.branchId ?? null,
    metadata: input.metadata ?? null,
    createdBy: input.createdBy,
    createdAt: nowIso(),
  };
}

export function findMainBranchForChapter(chapter: Chapter): Branch | undefined {
  return chapter.branches.find((b) => b.slug === MAIN_SLUG);
}

export function findBranch(
  chapter: Chapter,
  branchId: string
): Branch | undefined {
  return chapter.branches.find((b) => b.id === branchId);
}

/**
 * Crea un proyecto con un capítulo, rama `main` y una versión inicial vacía; `mainVersionId` apunta a esa versión.
 */
export function createInitialProject(name: string): {
  project: Project;
  activeChapterId: string;
  activeVersionId: string;
  activeBranchId: string;
} {
  const projectId = uuidv4();
  const chapterId = uuidv4();
  const mainBranchId = uuidv4();
  const t = nowIso();
  const mainBranch: Branch = {
    id: mainBranchId,
    chapterId,
    slug: MAIN_SLUG,
    name: MAIN_BRANCH_NAME,
    description: null,
    createdFromVersionId: null,
    status: "active",
    createdAt: t,
  };
  const firstVersion = createVersionSnapshot({
    content: "",
    parentVersionId: null,
    createdBy: "user",
    branchId: mainBranchId,
  });

  const chapter: Chapter = {
    id: chapterId,
    order: 0,
    mainVersionId: firstVersion.id,
    branches: [mainBranch],
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
    activeBranchId: mainBranchId,
  };
}

type LegacyVersion = {
  id: string;
  content: string;
  parentVersionId: string | null;
  createdBy: VersionCreatedBy;
  createdAt: string;
  branchId?: string | null;
  metadata?: VersionMetadata | null;
};

type LegacyChapter = {
  id: string;
  order: number;
  versions: LegacyVersion[];
  mainVersionId?: string | null;
  branches?: Branch[];
};

/**
 * Añade ramas mínimas y `main` para proyectos guardados sin el grafo (localStorage o migración).
 */
export function normalizeProject(input: Project | Record<string, unknown>): Project {
  const raw = input as { chapters?: LegacyChapter[]; id?: string; name?: string };
  if (!raw.chapters?.length) {
    if (
      isRecord(input) &&
      typeof (input as { id?: string }).id === "string" &&
      typeof (input as { name?: string }).name === "string"
    ) {
      return createInitialProject((input as { name: string }).name).project;
    }
    return createInitialProject("Borrador").project;
  }
  const chapters: Chapter[] = raw.chapters.map((ch) => {
    if (ch.branches?.length) {
      const c = { ...ch, branches: ch.branches, versions: ch.versions };
      return chapterSchema.parse(c);
    }
    const t = nowIso();
    const mainBranchId = uuidv4();
    const mainBranch: Branch = {
      id: mainBranchId,
      chapterId: ch.id,
      slug: MAIN_SLUG,
      name: MAIN_BRANCH_NAME,
      description: null,
      createdFromVersionId: null,
      status: "active",
      createdAt: t,
    };
    const versions: Version[] = ch.versions.map(
      (v) =>
        versionSchema.parse({
          id: v.id,
          content: v.content,
          parentVersionId: v.parentVersionId,
          createdBy: v.createdBy,
          createdAt: v.createdAt,
          branchId: v.branchId ?? mainBranchId,
          metadata: v.metadata ?? null,
        } as Version)
    );
    const firstId = versions[0]?.id;
    return chapterSchema.parse({
      id: ch.id,
      order: ch.order,
      mainVersionId: ch.mainVersionId ?? firstId ?? null,
      branches: [mainBranch],
      versions,
    });
  });
  return projectSchema.parse({
    id: raw.id ?? uuidv4(),
    name: typeof raw.name === "string" && raw.name ? raw.name : "Borrador",
    chapters,
  });
}

export function findChapter(
  project: Project,
  chapterId: string
): Chapter | undefined {
  return project.chapters.find((c) => c.id === chapterId);
}

export function findVersion(
  chapter: Chapter,
  versionId: string
): Version | undefined {
  return chapter.versions.find((v) => v.id === versionId);
}

function slugifyIntent(name: string): string {
  const s = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9áéíóúñü\s-]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return s.slice(0, 48) || "variante";
}

/**
 * Crea variante (intención) y un snapshot hija a partir de la versión base (fork explícito).
 */
export function createIntentVariation(
  chapter: Chapter,
  input: {
    intentLabel: string;
    description?: string;
    fromVersion: Version;
  }
): { chapter: Chapter; newBranch: Branch; newVersion: Version; newBranchId: string; newVersionId: string } {
  const t = nowIso();
  const baseSlug = slugifyIntent(input.intentLabel);
  let slug = baseSlug;
  let n = 0;
  while (chapter.branches.some((b) => b.slug === slug)) {
    n += 1;
    slug = `${baseSlug}-${n}`;
  }
  const newBranchId = uuidv4();
  const newBranch: Branch = {
    id: newBranchId,
    chapterId: chapter.id,
    slug,
    name: input.intentLabel.trim() || "Variante",
    description: input.description?.trim() ?? null,
    createdFromVersionId: input.fromVersion.id,
    status: "active",
    createdAt: t,
  };
  const newVersion = createVersionSnapshot({
    content: input.fromVersion.content,
    parentVersionId: input.fromVersion.id,
    createdBy: "user",
    branchId: newBranchId,
  });
  const nextChapter: Chapter = {
    ...chapter,
    branches: [...chapter.branches, newBranch],
    versions: [...chapter.versions, newVersion],
  };
  return {
    chapter: nextChapter,
    newBranch,
    newVersion,
    newBranchId,
    newVersionId: newVersion.id,
  };
}

/**
 * Sustituye el puntero de versión oficial (main) sin tocar el grafo. El usuario elige el snapshot canónico.
 */
export function setChapterMainVersion(
  chapter: Chapter,
  versionId: string
): Chapter {
  if (!findVersion(chapter, versionId)) {
    return chapter;
  }
  return { ...chapter, mainVersionId: versionId };
}

export type ManualMergeMode = "keepA" | "keepB" | "smart";

/**
 * Nueva `Version` por merge explícito: A gana, B gana, o “fusión” (texto compuesto; IA puede sustituir el texto antes de guardar).
 */
export function createMergedVersion(
  left: Version,
  right: Version,
  mode: ManualMergeMode,
  input?: { smartText?: string }
): Version {
  const meta: VersionMetadata = {
    mergeParentIds: [left.id, right.id],
    smartMerge: mode === "smart",
  };
  if (mode === "keepA") {
    return createVersionSnapshot({
      content: left.content,
      parentVersionId: right.id,
      createdBy: "user",
      branchId: right.branchId ?? left.branchId ?? null,
      metadata: { ...meta, styleShift: "elegir-A" },
    });
  }
  if (mode === "keepB") {
    return createVersionSnapshot({
      content: right.content,
      parentVersionId: right.id,
      createdBy: "user",
      branchId: right.branchId ?? left.branchId ?? null,
      metadata: { ...meta, styleShift: "elegir-B" },
    });
  }
  const combined =
    input?.smartText?.trim() ??
    `${left.content}\n\n— — —\n\n${right.content}`;
  return createVersionSnapshot({
    content: combined,
    parentVersionId: right.id,
    createdBy: "user",
    branchId: right.branchId ?? left.branchId ?? null,
    metadata: { ...meta, smartMerge: true, aiGenerated: true },
  });
}

/**
 * Añade una versión inmutable; si `branchId` se omite, se usa el de `parentVersion` o de la rama activa.
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
    chapters: project.chapters.map((c) =>
      c.id === nextChapter.id ? nextChapter : c
    ),
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
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

