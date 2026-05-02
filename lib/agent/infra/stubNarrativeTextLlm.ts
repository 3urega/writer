import type { AgentLlmMessage } from "../ports/types";
import type { NarrativeTextLlm } from "../ports/narrativeTextLlm";

/**
 * Respuesta cálida sin red (tests / AGENT_USE_STUB).
 */
export function createStubNarrativeTextLlm(): NarrativeTextLlm {
  return {
    async completeTextMessages(
      messages: AgentLlmMessage[]
    ): Promise<string> {
      const lastUser =
        [...messages].reverse().find((m) => m.role === "user")?.content ??
        "";
      const seed = lastUser.trim().slice(0, 200);
      if (
        messages.filter((m) => m.role === "user").length >= 2 ||
        /apertura|primera escena|borrador|párrafo/i.test(lastUser)
      ) {
        return [
          seed ?
            `Aquí va una primera apertura suave, nutrida de lo que compartiste: «${seed}${seed.length >= 200 ? "…" : ""}»`
          : "Una primera línea que aún tiembla, como quien posa la mano en una puerta.",
          "",
          "Podemos pulir el ritmo y el detalle cuando quieras; esto es sólo un comienzo para que lo sientas tuyo.",
        ].join("\n");
      }
      return [
        "Esto es lo que empiezo a imaginar cuando dejo que tu idea me atraviese.",
        "",
        seed ?
          `Hay algo vivo en «${seed}${seed.length >= 200 ? "…" : ""}», como una semilla de historia que aún no ha elegido su clima.`
        : "Hay una historia que pide espacio, sin prisa.",
        "",
        "¿Podría sentirse como un encuentro pequeño que cambia el rumbo? ¿O como un misterio que empieza en lo cotidiano? Te propongo tres puertas, y siempre puedes mezclarlas o inventar la tuya:",
        "",
        "— Presentar a alguien en un instante frágil.",
        "— Empezar con algo que falta o que vuelve sin avisar.",
        "— Abrir con una escena casi banal donde ya late el conflicto.",
        "",
        "[stub] Sin red: define OPENAI_API_KEY u OLLAMA_BASE_URL para respuestas reales.",
      ].join("\n");
    },
  };
}
