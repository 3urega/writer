import { z } from "zod";

export const versionCreatedBySchema = z.enum(["user", "agent"]);
export type VersionCreatedBy = z.infer<typeof versionCreatedBySchema>;

/** Metadatos en snapshot; trazabilidad de merge y pistas de IA. */
export const versionMetadataSchema = z
  .object({
    mergeParentIds: z.array(z.string().uuid()).optional(),
    smartMerge: z.boolean().optional(),
    styleShift: z.string().optional(),
    aiGenerated: z.boolean().optional(),
  })
  .passthrough();

export type VersionMetadata = z.infer<typeof versionMetadataSchema>;

export const versionSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  parentVersionId: z.string().uuid().nullable(),
  branchId: z.string().uuid().nullable().optional(),
  metadata: versionMetadataSchema.nullable().optional(),
  createdBy: versionCreatedBySchema,
  createdAt: z.string().datetime(),
});
export type Version = z.infer<typeof versionSchema>;

export const branchStatusSchema = z.enum(["active", "merged", "discarded"]);
export type BranchStatus = z.infer<typeof branchStatusSchema>;

export const branchSchema = z.object({
  id: z.string().uuid(),
  chapterId: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  createdFromVersionId: z.string().uuid().nullable().optional(),
  status: branchStatusSchema,
  createdAt: z.string().datetime(),
});
export type Branch = z.infer<typeof branchSchema>;

export const chapterSchema = z.object({
  id: z.string().uuid(),
  order: z.number().int().nonnegative(),
  /** Puntero a la versión “oficial” (main) del capítulo. */
  mainVersionId: z.string().uuid().nullable().optional(),
  branches: z.array(branchSchema),
  versions: z.array(versionSchema),
});
export type Chapter = z.infer<typeof chapterSchema>;

export const projectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  chapters: z.array(chapterSchema),
});
export type Project = z.infer<typeof projectSchema>;

/** Fragment: índices respecto al texto de la versión mostrada (no persistido como entidad). */
export const fragmentSchema = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  text: z.string(),
});
export type Fragment = z.infer<typeof fragmentSchema>;

export const editorViewModeSchema = z.enum(["edit", "diff", "ai"]);
export type EditorViewMode = z.infer<typeof editorViewModeSchema>;

export const projectFileSchema = z.object({
  project: projectSchema,
  activeChapterId: z.string().uuid(),
  activeVersionId: z.string().uuid(),
  activeBranchId: z.string().uuid().nullable().optional(),
  viewMode: editorViewModeSchema.optional().default("edit"),
  /** Par para comparar (vista dif). */
  compareVersionA: z.string().uuid().nullable().optional(),
  compareVersionB: z.string().uuid().nullable().optional(),
});
export type ProjectFile = z.infer<typeof projectFileSchema>;
/** Entrada antes de `default` (p. ej. en localStorage antiguo sin `viewMode`). */
export type ProjectFileInput = z.input<typeof projectFileSchema>;
