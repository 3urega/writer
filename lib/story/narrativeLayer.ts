import type { Chapter, Project, Version } from "@/lib/domain/types";
import {
  createIntentVariation,
  createVersionSnapshot,
  findChapter,
  findMainBranchForChapter,
  findVersion,
  replaceChapter,
  saveNewVersionInChapter,
  setChapterMainVersion,
} from "@/lib/domain/versioning";

const MOMENTS_LS_PREFIX = "nm-moments-v1:";

export type NarrativeMoment = {
  id: string;
  label: string;
  savedAt: string;
  /** Si existe en dominio, id de versión */
  versionId?: string;
};

function momentsKey(projectId: string): string {
  return `${MOMENTS_LS_PREFIX}${projectId}`;
}

export function loadLocalMoments(projectId: string): NarrativeMoment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(momentsKey(projectId));
    if (!raw) return [];
    const j = JSON.parse(raw) as NarrativeMoment[];
    return Array.isArray(j) ? j : [];
  } catch {
    return [];
  }
}

export function saveLocalMoments(
  projectId: string,
  moments: NarrativeMoment[]
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(momentsKey(projectId), JSON.stringify(moments));
  } catch {
    /* ignore */
  }
}

function tipVersionForChapter(chapter: Chapter): Version | null {
  const id = chapter.mainVersionId ?? chapter.versions[0]?.id ?? null;
  if (!id) return null;
  return findVersion(chapter, id) ?? null;
}

/**
 * Crea una “exploración” humana: variación en dominio a partir del texto actual del editor.
 */
export function recordNarrativeExploration(input: {
  project: Project;
  chapterId: string;
  intentLabel: string;
  editorContent: string;
}): { project: Project; userMessage: string } {
  const ch = findChapter(input.project, input.chapterId);
  if (!ch) {
    throw new Error("No encontramos el capítulo en el libro.");
  }
  const from = tipVersionForChapter(ch);
  if (!from) {
    throw new Error("No hay una base de texto para explorar desde aquí.");
  }
  const { chapter: withBranch, newVersion } = createIntentVariation(ch, {
    intentLabel: input.intentLabel,
    fromVersion: from,
  });
  const versionWithDraft: Version = {
    ...newVersion,
    content: input.editorContent,
    metadata: {
      ...(newVersion.metadata ?? {}),
      styleShift: "exploracion-narrativa",
    },
  };
  const versions = withBranch.versions.map((v) =>
    v.id === newVersion.id ? versionWithDraft : v
  );
  const chNext: Chapter = { ...withBranch, versions };
  const project = replaceChapter(input.project, chNext);
  const msg = `✨ Listo: «${input.intentLabel.trim()}» — un camino nuevo sin borrar lo anterior.`;
  return { project, userMessage: msg };
}

/**
 * Guarda un momento con nombre: nueva versión en la línea principal con metadata legible.
 */
export function recordNarrativeMoment(input: {
  project: Project;
  chapterId: string;
  title: string;
  editorContent: string;
}): { project: Project; newVersionId: string; userMessage: string } {
  const ch = findChapter(input.project, input.chapterId);
  if (!ch) {
    throw new Error("No encontramos el capítulo.");
  }
  const parent = tipVersionForChapter(ch);
  if (!parent) {
    throw new Error("No hay versión base para este momento.");
  }
  const main = findMainBranchForChapter(ch);
  const branchId = main?.id ?? parent.branchId ?? null;
  const snap = createVersionSnapshot({
    content: input.editorContent,
    parentVersionId: parent.id,
    createdBy: "user",
    branchId,
    metadata: {
      narrativeMomentTitle: input.title.trim(),
    },
  });
  const { chapter: ch2 } = saveNewVersionInChapter(ch, snap);
  const ch3 = setChapterMainVersion(ch2, snap.id);
  const project = replaceChapter(input.project, ch3);
  const list = loadLocalMoments(input.project.id);
  saveLocalMoments(input.project.id, [
    {
      id: snap.id,
      label: input.title.trim(),
      savedAt: new Date().toISOString(),
      versionId: snap.id,
    },
    ...list,
  ]);
  const userMessage = `Tu momento «${input.title.trim()}» quedó guardado en la historia.`;
  return { project, newVersionId: snap.id, userMessage };
}

export type EditorialTimelineLine = {
  depth: number;
  text: string;
};

/** Vista árbol editorial (texto plano con sangría) sin términos técnicos. */
export function buildEditorialTimeline(
  project: Project,
  chapterId: string
): EditorialTimelineLine[] {
  const ch = findChapter(project, chapterId);
  if (!ch) return [{ depth: 0, text: "Capítulo — sin datos todavía." }];
  const lines: EditorialTimelineLine[] = [];
  const capLabel =
    ch.title?.trim() || `Capítulo ${ch.order + 1}`;
  lines.push({ depth: 0, text: capLabel });
  const main = findMainBranchForChapter(ch);
  lines.push({
    depth: 1,
    text: main?.name ?? "Historia principal",
  });
  for (const b of ch.branches) {
    if (main && b.id === main.id) continue;
    lines.push({
      depth: 2,
      text: `· ${b.name}`,
    });
  }
  return lines;
}

export function listMomentLabelsFromMetadata(
  project: Project,
  chapterId: string
): Array<{ label: string; hint: string }> {
  const ch = findChapter(project, chapterId);
  if (!ch) return [];
  const out: Array<{ label: string; hint: string }> = [];
  for (const v of ch.versions) {
    const meta = v.metadata as { narrativeMomentTitle?: string } | null | undefined;
    const t = meta?.narrativeMomentTitle;
    if (t && typeof t === "string") {
      out.push({
        label: t,
        hint: new Date(v.createdAt).toLocaleDateString("es-ES", {
          day: "numeric",
          month: "short",
        }),
      });
    }
  }
  return out.reverse().slice(0, 12);
}
