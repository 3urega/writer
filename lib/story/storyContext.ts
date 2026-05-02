import { z } from "zod";

import type { NarrativeBootstrap } from "@/lib/story/narrativeBootstrap";

const characterSchema = z.object({
  id: z.string(),
  name: z.string(),
  notes: z.string().optional(),
  traits: z.array(z.string()).default([]),
  arc_state: z.string().optional(),
  character_relationships: z
    .array(
      z.object({
        characterId: z.string().optional(),
        label: z.string(),
      })
    )
    .optional(),
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

const storyEventSchema = z.object({
  id: z.string(),
  chapter: z.number().int().nonnegative(),
  event: z.string(),
  importance: z.enum(["low", "medium", "high"]).default("medium"),
});

const plotThreadSchema = z.object({
  question: z.string(),
  resolved: z.boolean().default(false),
});

const toneSchema = z.object({
  label: z.string(),
  notes: z.string().optional(),
  /** p. ej. slow burn, ágil */
  pacing: z.string().optional(),
});

export const storyContextSchema = z.object({
  characters: z.array(characterSchema).default([]),
  locations: z.array(locationSchema).default([]),
  relationships: z.array(relationshipSchema).default([]),
  timeline_events: z.array(timelineEventSchema).default([]),
  story_events: z.array(storyEventSchema).default([]),
  themes: z.array(z.string()).default([]),
  tone: toneSchema.default({ label: "", notes: "" }),
  /** @deprecated usar plot_threads; se migra al cargar */
  open_threads: z.array(z.string()).default([]),
  plot_threads: z.array(plotThreadSchema).default([]),
  chapter_summaries: z
    .array(z.object({ chapterKey: z.string(), summary: z.string() }))
    .default([]),
});

export type StoryContext = z.infer<typeof storyContextSchema>;
export type StoryContextPatch = Partial<Omit<StoryContext, "tone">> & {
  tone?: Partial<StoryContext["tone"]>;
};

function migrateRawStoryContext(raw: Record<string, unknown>): void {
  const plot = raw.plot_threads;
  const open = raw.open_threads;
  if (
    (!Array.isArray(plot) || plot.length === 0) &&
    Array.isArray(open) &&
    open.length > 0 &&
    typeof open[0] === "string"
  ) {
    raw.plot_threads = (open as string[]).map((question) => ({
      question,
      resolved: false,
    }));
  }
}

export function emptyStoryContext(): StoryContext {
  return storyContextSchema.parse({});
}

export function parseStoryContext(raw: unknown): StoryContext {
  const base = emptyStoryContext();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return base;
  }
  migrateRawStoryContext(raw as Record<string, unknown>);
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
        pacing: p.tone.pacing ?? prev.tone.pacing,
      }
    : prev.tone;
  return storyContextSchema.parse({
    characters: p.characters !== undefined ? p.characters : prev.characters,
    locations: p.locations !== undefined ? p.locations : prev.locations,
    relationships:
      p.relationships !== undefined ? p.relationships : prev.relationships,
    timeline_events:
      p.timeline_events !== undefined ? p.timeline_events : prev.timeline_events,
    story_events:
      p.story_events !== undefined ? p.story_events : prev.story_events,
    themes: p.themes !== undefined ? p.themes : prev.themes,
    tone: nextTone,
    open_threads:
      p.open_threads !== undefined ? p.open_threads : prev.open_threads,
    plot_threads:
      p.plot_threads !== undefined ? p.plot_threads : prev.plot_threads,
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

/** Heurística simple para ensayar contexto al modelo (antes de RAG semántico). */
export function memoryForRetrieval(
  ctx: StoryContext,
  chapterExcerpt: string,
  k = 4
): StoryContext {
  const words = new Set(
    chapterExcerpt
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 3)
      .slice(0, 40)
  );
  const score = (text: string): number => {
    let s = 0;
    for (const w of words) {
      if (text.toLowerCase().includes(w)) s += 1;
    }
    return s;
  };
  const chars = [...ctx.characters]
    .map((c) => ({
      c,
      s:
        score(c.name) +
        score(c.notes ?? "") +
        score(c.arc_state ?? "") +
        (c.traits?.join(" ") ? score(c.traits.join(" ")) : 0),
    }))
    .sort((a, b) => b.s - a.s)
    .slice(0, k)
    .map((x) => x.c);
  const threads = ctx.plot_threads.filter((t) => !t.resolved).slice(0, k);
  const events = ctx.story_events
    .filter((e) => e.importance === "high" || score(e.event) > 0)
    .slice(0, k);
  return mergeStoryContext(emptyStoryContext(), {
    characters: chars,
    plot_threads: threads,
    story_events: events,
    themes: ctx.themes.slice(0, 6),
    tone: ctx.tone,
  });
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
    tone: {
      label: boot.tone,
      notes: boot.synopsis.slice(0, 400),
      pacing: undefined,
    },
    plot_threads:
      boot.conflict ?
        [{ question: boot.conflict.slice(0, 240), resolved: false }]
      : [],
    open_threads: [],
    characters:
      boot.protagonist ?
        [
          {
            id: `prot-${projectId.slice(0, 8)}`,
            name: "Figura central",
            notes: boot.protagonist.slice(0, 500),
            traits: [],
          },
        ]
      : [],
  });
}
