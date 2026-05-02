import type { AgentToolRegistry } from "../ports/agentTool";

/** Registro que limita qué herramientas ve el modelo (modo narrativo / intents). */
export function filterToolRegistry(
  base: AgentToolRegistry,
  allowed: ReadonlySet<string>
): AgentToolRegistry {
  return {
    get: (name: string) =>
      allowed.has(name) ? base.get(name) : undefined,
    list: () => base.list().filter((t) => allowed.has(t.name)),
  };
}
