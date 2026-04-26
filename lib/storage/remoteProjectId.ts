const REMOTE_PROJECT_ID_KEY = "ai-writer:remoteProjectId";

/** UUID del proyecto en el servidor; persiste en localStorage (híbrido con localProjectStore). */
export function getStoredRemoteProjectId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REMOTE_PROJECT_ID_KEY);
}

export function setStoredRemoteProjectId(id: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REMOTE_PROJECT_ID_KEY, id);
}

export function clearStoredRemoteProjectId(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(REMOTE_PROJECT_ID_KEY);
}

export function getDefaultRemoteProjectIdFromEnv(): string | null {
  const v = process.env.NEXT_PUBLIC_DEFAULT_PROJECT_ID;
  if (v == null || v.trim() === "") return null;
  return v.trim();
}
