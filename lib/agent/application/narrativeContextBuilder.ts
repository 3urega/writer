import type { NarrativeSession } from "@/lib/story/narrativeSession";
import {
  emptyStoryContext,
  memoryForRetrieval,
  type StoryContext,
} from "@/lib/story/storyContext";

import type { NarrativeIntent } from "./narrativeIntent";

const CAP = {
  userLine: 900,
  excerpt: 3200,
  memoryBlock: 2400,
  refsLine: 400,
} as const;

function clip(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function excerptAroundSelection(
  text: string,
  start?: number,
  end?: number,
  radius = 900
): string {
  if (!text) return "";
  if (
    start !== undefined &&
    end !== undefined &&
    end > start &&
    start >= 0 &&
    end <= text.length
  ) {
    const a = Math.max(0, start - radius);
    const b = Math.min(text.length, end + radius);
    return clip(text.slice(a, b), CAP.excerpt);
  }
  return clip(text.slice(Math.max(0, text.length - radius * 2)), CAP.excerpt);
}

function formatMemorySnapshot(ctx: StoryContext): string {
  const lines: string[] = [];
  if (ctx.tone.label || ctx.tone.pacing) {
    lines.push(
      `Tono: ${ctx.tone.label || "—"}${ctx.tone.pacing ? ` · Ritmo: ${ctx.tone.pacing}` : ""}`
    );
  }
  for (const c of ctx.characters.slice(0, 6)) {
    const traits = c.traits?.length ? ` [${c.traits.join(", ")}]` : "";
    const arc = c.arc_state ? ` Estado: ${c.arc_state}` : "";
    lines.push(
      `- Personaje: ${c.name}${traits}${arc}${c.notes ? ` — ${clip(c.notes, 200)}` : ""}`
    );
  }
  for (const t of ctx.plot_threads.slice(0, 5)) {
    lines.push(
      `- Hilo: ${t.question}${t.resolved ? " (resuelto)" : ""}`
    );
  }
  for (const e of ctx.story_events.slice(0, 4)) {
    lines.push(
      `- Evento (cap. ${e.chapter}, ${e.importance}): ${clip(e.event, 160)}`
    );
  }
  if (ctx.themes.length) {
    lines.push(`Temas: ${ctx.themes.join(", ")}`);
  }
  return clip(lines.join("\n"), CAP.memoryBlock);
}

export type BuiltNarrativeMessages = {
  userMessage: string;
};

/**
 * Ensambla el mensaje de usuario enriquecido sin volcar libro completo ni todos los PDFs.
 */
export function buildNarrativeUserMessage(input: {
  rawUserMessage: string;
  session: NarrativeSession;
  intent: NarrativeIntent;
}): BuiltNarrativeMessages {
  const { session, rawUserMessage, intent } = input;
  const sessionMode = session.agentMode ?? "collab";
  const refs =
    session.activeReferenceIds?.length ?
      `Referencias activas (ids): ${session.activeReferenceIds.slice(0, 12).join(", ")}`
    : "Referencias: ninguna marcada en sesión.";

  const excerpt = excerptAroundSelection(
    session.chapterText ?? "",
    session.selectionStart,
    session.selectionEnd
  );

  const memorySource: StoryContext =
    session.storyMemorySnapshot ?? emptyStoryContext();

  const memorySlice = memoryForRetrieval(
    memorySource,
    session.chapterText ?? excerpt,
    5
  );
  const memoryBlock = formatMemorySnapshot(memorySlice);

  const intentHint = [
    "",
    `[Intención detectada: ${intent}; modo_ui: ${sessionMode}]`,
    "Trabaja con continuidad: no contradigas la memoria salvo que el usuario pida explícitamente cambiar el relato.",
  ].join("\n");

  const blocks = [
    "## Instrucción del autor",
    clip(rawUserMessage.trim(), CAP.userLine),
    "",
    "## Fragmento cercano (acotado)",
    excerpt || "(sin texto en sesión)",
    "",
    "## Memoria narrativa (resumen recuperado)",
    memoryBlock || "(sin memoria enviada)",
    "",
    "## Referencias",
    clip(refs, CAP.refsLine),
    intentHint,
  ];

  return { userMessage: blocks.join("\n") };
}
