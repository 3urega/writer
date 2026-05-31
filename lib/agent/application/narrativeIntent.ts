/**
 * Intención narrativa (heurística local; sin segunda llamada LLM en esta iteración).
 */
export type NarrativeIntent =
  | "rewrite"
  | "tension"
  | "dialogue"
  | "continue"
  | "unsure_scene"
  | "memory_update"
  | "general";

export type NarrativeIntentResult = {
  intent: NarrativeIntent;
  confidence: number;
};

const REWRITE_HINT =
  /\b(reescrib|reformula|cambia esto|mejor|pulir|corrige)\b/i;
const RHYME_HINT =
  /\b(rima|rimar|asonante|asonancia|consonante|metrica|métrica|vers[oó])\b/i;
const TENSION_HINT = /\b(tensión|tenso|suspenso|miedo|aceler|urgente)\b/i;
const DIALOGUE_HINT = /\b(diálogo|habla|convers|dice|pregunta|responde)\b/i;
const CONTINUE_HINT = /\b(continu|siguiente|qué pasa después|sigue)\b/i;
const UNSURE_HINT =
  /\b(no me convence|no sé|atalado|atascado|bloqueo|funciona mal)\b/i;
const MEMORY_HINT =
  /\b(personaje|recuerda|memoria|coherencia|antes dijimos|contradic)\b/i;

export function detectNarrativeIntent(userMessage: string): NarrativeIntentResult {
  const m = userMessage.trim();
  if (!m) return { intent: "general", confidence: 0.3 };
  if (MEMORY_HINT.test(m)) return { intent: "memory_update", confidence: 0.75 };
  if (UNSURE_HINT.test(m)) return { intent: "unsure_scene", confidence: 0.7 };
  if (CONTINUE_HINT.test(m)) return { intent: "continue", confidence: 0.72 };
  if (DIALOGUE_HINT.test(m)) return { intent: "dialogue", confidence: 0.68 };
  if (TENSION_HINT.test(m)) return { intent: "tension", confidence: 0.68 };
  if (RHYME_HINT.test(m) || REWRITE_HINT.test(m)) {
    return { intent: "rewrite", confidence: RHYME_HINT.test(m) ? 0.78 : 0.7 };
  }
  return { intent: "general", confidence: 0.5 };
}

const ALL_TOOLS_BASE = [
  "search_knowledge",
  "list_reference_documents",
  "get_context",
  "extract_style",
  "rewrite_fragment",
  "evaluate_text",
  "compute_diff",
  "create_version",
] as const;

function setOf(...names: string[]): Set<string> {
  return new Set(names);
}

/** Herramientas permitidas por intención (política; el registro real puede tener menos si faltan en el proyecto). */
export function allowedToolNamesForIntent(intent: NarrativeIntent): Set<string> {
  const core = setOf(
    "get_context",
    "search_knowledge",
    "list_reference_documents",
    "rewrite_fragment"
  );
  const style = setOf("extract_style");
  const evalDiff = setOf("evaluate_text", "compute_diff");
  const version = setOf("create_version");

  switch (intent) {
    case "rewrite":
      return new Set([...core, ...style, ...evalDiff, ...version]);
    case "tension":
    case "dialogue":
      return new Set([...core, ...style, ...evalDiff, ...version]);
    case "continue":
      return new Set([...core, ...style]);
    case "unsure_scene":
      return new Set([...core, ...style, ...evalDiff, ...version]);
    case "memory_update":
      return new Set([
        "search_knowledge",
        "list_reference_documents",
        "get_context",
        "evaluate_text",
      ]);
    case "general":
      return new Set(ALL_TOOLS_BASE);
    default:
      return new Set(ALL_TOOLS_BASE);
  }
}
