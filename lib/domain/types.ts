import { z } from "zod";

export const versionCreatedBySchema = z.enum(["user", "agent"]);
export type VersionCreatedBy = z.infer<typeof versionCreatedBySchema>;

export const versionSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  parentVersionId: z.string().uuid().nullable(),
  createdBy: versionCreatedBySchema,
  createdAt: z.string().datetime(),
});
export type Version = z.infer<typeof versionSchema>;

export const chapterSchema = z.object({
  id: z.string().uuid(),
  order: z.number().int().nonnegative(),
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

export const projectFileSchema = z.object({
  project: projectSchema,
  activeChapterId: z.string().uuid(),
  activeVersionId: z.string().uuid(),
});
export type ProjectFile = z.infer<typeof projectFileSchema>;
