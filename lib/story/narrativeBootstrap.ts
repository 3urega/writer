export type NarrativeBootstrap = {
  synopsis: string;
  openingParagraph: string;
  protagonist: string;
  conflict: string;
  tone: string;
  themes: string[];
  projectTitle: string;
};

export function narrativeBootstrapKey(projectId: string): string {
  return `nm-bootstrap:${projectId}`;
}

export function saveNarrativeBootstrap(
  projectId: string,
  data: NarrativeBootstrap
): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      narrativeBootstrapKey(projectId),
      JSON.stringify(data)
    );
  } catch {
    /* ignore quota */
  }
}

export function loadNarrativeBootstrap(
  projectId: string
): NarrativeBootstrap | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(narrativeBootstrapKey(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NarrativeBootstrap;
    if (typeof parsed.synopsis !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}
