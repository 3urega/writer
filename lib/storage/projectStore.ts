import { projectFileSchema, type Project, type ProjectFile } from "../domain/types";
import { createInitialProject } from "../domain/versioning";

const STORAGE_KEY = "ai-writer:project";
const DEFAULT_NAME = "Borrador";

export type ProjectState = ProjectFile & {
  /** Contenido del editor; puede diferi del snapshot hasta guardar. */
  editorContent: string;
};

export function createStateFromFile(file: ProjectFile): ProjectState {
  const { project, activeChapterId, activeVersionId } = file;
  const ch = project.chapters.find((c) => c.id === activeChapterId);
  const v = ch?.versions.find((x) => x.id === activeVersionId);
  return {
    project,
    activeChapterId,
    activeVersionId,
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
  });
}

/**
 * Estado a partir de un `Project` cargado del servidor: primer capítulo por `order`
 * y última versión por `createdAt` como activa.
 */
export function projectStateFromRemoteProject(project: Project): ProjectState {
  const chapters = [...project.chapters].sort((a, b) => a.order - b.order);
  const ch = chapters[0];
  if (!ch) {
    return getDefaultProjectState();
  }
  const versions = [...ch.versions].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const last = versions[versions.length - 1] ?? ch.versions[0];
  return createStateFromFile({
    project,
    activeChapterId: ch.id,
    activeVersionId: last.id,
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
    return projectFileSchema.parse(JSON.parse(raw));
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
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  },
  clear() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
  },
};
