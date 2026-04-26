export type ProjectSummary = {
  id: string;
  name: string;
  lastEdited: string;
  chapterCount: number;
  /** 0–1 */
  progress: number;
};
