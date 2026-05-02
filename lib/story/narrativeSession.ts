import { z } from "zod";

import { storyContextSchema } from "@/lib/story/storyContext";

/**
 * Sesión enviada por el modo narrativo al orquestador (sin depender de localStorage en servidor).
 */
export const narrativeSessionSchema = z
  .object({
    projectId: z.string().uuid(),
    chapterId: z.string().uuid(),
    branchId: z.string().uuid().nullable().optional(),
    versionId: z.string().uuid(),
    /** Texto actual del capítulo (borrador o versión mostrada). */
    chapterText: z.string().max(500_000).optional(),
    selectionStart: z.number().int().min(0).optional(),
    selectionEnd: z.number().int().min(0).optional(),
    activeReferenceIds: z.array(z.string()).max(64).optional(),
    agentMode: z.enum(["collab", "gentle", "bold"]).optional(),
    /** Copia acotada de memoria narrativa desde el cliente. */
    storyMemorySnapshot: storyContextSchema.optional(),
  })
  .strict()
  .refine(
    (s) => {
      const a = s.selectionStart;
      const b = s.selectionEnd;
      if (a === undefined && b === undefined) return true;
      if (a === undefined || b === undefined) return false;
      return b >= a;
    },
    { message: "selectionEnd debe ser >= selectionStart si ambos vienen" }
  );

export type NarrativeSession = z.infer<typeof narrativeSessionSchema>;
