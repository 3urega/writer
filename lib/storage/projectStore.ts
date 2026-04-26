import {
  projectFileSchema,
  type Project,
  type ProjectFile,
  type ProjectFileInput,
} from "../domain/types";
import {
  createInitialProject,
  findChapter,
  findMainBranchForChapter,
  normalizeProject,
} from "../domain/versioning";

const STORAGE_KEY = "ai-writer:project";
const DEFAULT_NAME = "Borrador";

export type ProjectState = ProjectFile & {
  /** Contenido del editor; puede diferir del snapshot hasta guardar. */
  editorContent: string;
};

function resolveDefaultBranchId(project: Project, chapterId: string): string | null {
  const ch = findChapter(project, chapterId);
  if (!ch) return null;
  const main = findMainBranchForChapter(ch);
  return main?.id ?? ch.branches[0]?.id ?? null;
}

export function createStateFromFile(file: ProjectFileInput): ProjectState {
  const project = normalizeProject(file.project);
  const { activeChapterId, activeVersionId } = file;
  const ch = findChapter(project, activeChapterId);
  const v = ch?.versions.find((x) => x.id === activeVersionId);
  const br =
    (file.activeBranchId && ch?.branches.some((b) => b.id === file.activeBranchId)
      ? file.activeBranchId
      : v?.branchId) ??
    resolveDefaultBranchId(project, activeChapterId) ??
    null;
  return {
    project,
    activeChapterId,
    activeVersionId,
    activeBranchId: file.activeBranchId ?? br,
    viewMode: file.viewMode ?? "edit",
    compareVersionA: file.compareVersionA ?? null,
    compareVersionB: file.compareVersionB ?? null,
    editorContent: v?.content ?? "",
  };
}

/**
 * Estado inicial (sin `localStorage`), útil en SSR o primera carga.
 */
export function getDefaultProjectState(): ProjectState {
  const init = createInitialProject(DEFAULT_NAME);
  return createStateFromFile({
    project: init.project,
    activeChapterId: init.activeChapterId,
    activeVersionId: init.activeVersionId,
    activeBranchId: init.activeBranchId,
  });
}

/**
 * Estado a partir de un `Project` cargado del servidor: versión **oficial** (main) si existe;
 * si no, primera versión por `createdAt`.
 */
export function projectStateFromRemoteProject(project: Project): ProjectState {
  const p = normalizeProject(project);
  const chapters = [...p.chapters].sort((a, b) => a.order - b.order);
  const ch = chapters[0];
  if (!ch) {
    return getDefaultProjectState();
  }
  const versions = [...ch.versions].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const mainId = ch.mainVersionId;
  const mainV =
    (mainId && versions.find((v) => v.id === mainId)) ?? versions[0];
  if (!mainV) {
    return getDefaultProjectState();
  }
  return createStateFromFile({
    project: p,
    activeChapterId: ch.id,
    activeVersionId: mainV.id,
    activeBranchId: mainV.branchId ?? findMainBranchForChapter(ch)?.id ?? null,
  });
}

/**
 * Carga/ guarda el estado del proyecto en el cliente.
 */
export interface ProjectStore {
  load(): ProjectState | null;
  save(state: ProjectState): void;
  clear(): void;
}

function parseStored(raw: string | null): ProjectFile | null {
  if (raw == null) return null;
  try {
    const json = JSON.parse(raw) as Record<string, unknown> | null;
    if (json == null || typeof json !== "object" || !("project" in json)) {
      return null;
    }
    return projectFileSchema.parse({
      project: normalizeProject(
        json.project as Project | Record<string, unknown>
      ),
      activeChapterId: String(json.activeChapterId),
      activeVersionId: String(json.activeVersionId),
      activeBranchId:
        json.activeBranchId === undefined
          ? undefined
          : (json.activeBranchId as string | null),
      viewMode: json.viewMode as "edit" | "diff" | "ai" | undefined,
      compareVersionA:
        json.compareVersionA === undefined
          ? undefined
          : (json.compareVersionA as string | null),
      compareVersionB:
        json.compareVersionB === undefined
          ? undefined
          : (json.compareVersionB as string | null),
    });
  } catch {
    return null;
  }
}

export const localProjectStore: ProjectStore = {
  load() {
    if (typeof window === "undefined") return null;
    const file = parseStored(window.localStorage.getItem(STORAGE_KEY));
    if (!file) return null;
    return createStateFromFile(file);
  },
  save(state: ProjectState) {
    if (typeof window === "undefined") return;
    const toSave: ProjectFile = {
      project: state.project,
      activeChapterId: state.activeChapterId,
      activeVersionId: state.activeVersionId,
      activeBranchId: state.activeBranchId,
      viewMode: state.viewMode,
      compareVersionA: state.compareVersionA,
      compareVersionB: state.compareVersionB,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  },
  clear() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
  },
};
