import { z } from "zod";

import type { NarrativeBootstrap } from "@/lib/story/narrativeBootstrap";

const characterSchema = z.object({
  id: z.string(),
  name: z.string(),
  notes: z.string().optional(),
});

const locationSchema = z.object({
  id: z.string(),
  name: z.string(),
  notes: z.string().optional(),
});

const relationshipSchema = z.object({
  id: z.string(),
  between: z.tuple([z.string(), z.string()]),
  label: z.string(),
});

const timelineEventSchema = z.object({
  id: z.string(),
  label: z.string(),
  when: z.string().optional(),
});

const toneSchema = z.object({
  label: z.string(),
  notes: z.string().optional(),
});

export const storyContextSchema = z.object({
  characters: z.array(characterSchema).default([]),
  locations: z.array(locationSchema).default([]),
  relationships: z.array(relationshipSchema).default([]),
  timeline_events: z.array(timelineEventSchema).default([]),
  themes: z.array(z.string()).default([]),
  tone: toneSchema.default({ label: "", notes: "" }),
  open_threads: z.array(z.string()).default([]),
  chapter_summaries: z.array(z.object({ chapterKey: z.string(), summary: z.string() })).default([]),
});

export type StoryContext = z.infer<typeof storyContextSchema>;
export type StoryContextPatch = Partial<Omit<StoryContext, "tone">> & {
  tone?: Partial<StoryContext["tone"]>;
};

export function emptyStoryContext(): StoryContext {
  return storyContextSchema.parse({});
}

export function parseStoryContext(raw: unknown): StoryContext {
  const base = emptyStoryContext();
  const parsed = storyContextSchema.safeParse(raw);
  if (!parsed.success) return base;
  return mergeStoryContext(base, parsed.data);
}

export function mergeStoryContext(
  prev: StoryContext,
  patch: StoryContext | StoryContextPatch
): StoryContext {
  const p = patch as StoryContextPatch;
  const nextTone =
    p.tone !== undefined ?
      {
        label: p.tone.label ?? prev.tone.label,
        notes: p.tone.notes ?? prev.tone.notes,
      }
    : prev.tone;
  return storyContextSchema.parse({
    characters: p.characters !== undefined ? p.characters : prev.characters,
    locations: p.locations !== undefined ? p.locations : prev.locations,
    relationships:
      p.relationships !== undefined ? p.relationships : prev.relationships,
    timeline_events:
      p.timeline_events !== undefined ? p.timeline_events : prev.timeline_events,
    themes: p.themes !== undefined ? p.themes : prev.themes,
    tone: nextTone,
    open_threads:
      p.open_threads !== undefined ? p.open_threads : prev.open_threads,
    chapter_summaries:
      p.chapter_summaries !== undefined ?
        p.chapter_summaries
      : prev.chapter_summaries,
  });
}

export function storyContextStorageKey(projectId: string): string {
  return `nm-story-context:${projectId}`;
}

export function loadStoryContext(projectId: string): StoryContext {
  if (typeof window === "undefined") return emptyStoryContext();
  try {
    const raw = localStorage.getItem(storyContextStorageKey(projectId));
    if (!raw) return emptyStoryContext();
    return parseStoryContext(JSON.parse(raw) as unknown);
  } catch {
    return emptyStoryContext();
  }
}

export function saveStoryContext(projectId: string, ctx: StoryContext): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      storyContextStorageKey(projectId),
      JSON.stringify(ctx)
    );
  } catch {
    /* quota */
  }
}

/** Rellena memoria narrativa desde el bootstrap del onboarding (no machaca campos ya editados). */
export function seedStoryContextFromBootstrap(
  projectId: string,
  boot: NarrativeBootstrap
): StoryContext {
  const existing = loadStoryContext(projectId);
  const hasContent =
    existing.themes.length > 0 ||
    existing.characters.length > 0 ||
    existing.tone.label.length > 0;
  if (hasContent) return existing;
  return mergeStoryContext(existing, {
    themes: boot.themes,
    tone: { label: boot.tone, notes: boot.synopsis.slice(0, 400) },
    open_threads: boot.conflict ? [boot.conflict.slice(0, 200)] : [],
    characters:
      boot.protagonist ?
        [
          {
            id: `prot-${projectId.slice(0, 8)}`,
            name: "Figura central",
            notes: boot.protagonist.slice(0, 500),
          },
        ]
      : [],
  });
}
