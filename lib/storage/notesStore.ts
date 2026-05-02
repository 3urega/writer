const LS_KEY = "ai-writer:chapter-notes-v1";

function readAll(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const j = JSON.parse(raw) as Record<string, string>;
    return j && typeof j === "object" ? j : {};
  } catch {
    return {};
  }
}

function writeAll(m: Record<string, string>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_KEY, JSON.stringify(m));
}

export function notesStorageKey(projectId: string, chapterId: string): string {
  return `${projectId}:${chapterId}`;
}

export function loadChapterNote(projectId: string, chapterId: string): string {
  const k = notesStorageKey(projectId, chapterId);
  return readAll()[k] ?? "";
}

export function saveChapterNote(
  projectId: string,
  chapterId: string,
  text: string
): void {
  const m = readAll();
  const k = notesStorageKey(projectId, chapterId);
  if (text.trim() === "") delete m[k];
  else m[k] = text;
  writeAll(m);
}
