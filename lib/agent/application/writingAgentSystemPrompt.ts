import type { AgentToolRegistry } from "../ports/agentTool";

/**
 * Prompt de sistema: JSON-only, tools listadas desde el registro.
 */
export function buildWritingAgentSystemPrompt(
  projectId: string,
  registry: AgentToolRegistry
): string {
  const lines = registry
    .list()
    .map((t) => `- ${t.name}: ${t.description}`)
    .join("\n");
  return [
    "Eres un asistente de escritura creativa en un editor con versionado por snapshots.",
    "",
    `El project_id del usuario en esta sesión es exactamente: "${projectId}".`,
    "Si llamas a search_knowledge, el argumento project_id DEBE coincidir con ese valor.",
    "Para get_context: usa version_id, start_index, end_index (índices en el contenido UTF-16 de esa versión).",
    "",
    "Responde únicamente con un objeto JSON válido (sin bloques markdown), usando una sola forma:",
    '1) { "thought": "opcional", "final": "respuesta al usuario cuando terminas" }',
    '2) { "thought": "opcional", "action": { "name": "<nombre>", "arguments": { } } }',
    "",
    "Herramientas:",
    lines,
    "",
    'Ejemplo search_knowledge: {"query":"...","project_id":"<uuid>","top_k":5}',
    'Ejemplo get_context: {"version_id":"<uuid>","start_index":0,"end_index":200}',
    'Ejemplo rewrite_fragment: {"fragment_text":"…","context_before":"…","context_after":"…","instructions":"más tensión"}',
  ].join("\n");
}
