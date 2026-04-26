import type { ProjectSummary } from "./types";

/**
 * Vaciar el array para probar el estado vacío
 * ("Start your first book…" y CTA "Create New Book").
 */
export const recentProjects: ProjectSummary[] = [
  {
    id: "1",
    name: "Borrador de otoño",
    lastEdited: "Hace 2 horas",
    chapterCount: 4,
    progress: 0.42,
  },
  {
    id: "2",
    name: "Los días fríos",
    lastEdited: "Ayer",
    chapterCount: 2,
    progress: 0.18,
  },
];
