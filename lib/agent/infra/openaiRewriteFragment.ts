import OpenAI from "openai";

export type RewriteFragmentInput = {
  fragment_text: string;
  context_before: string;
  context_after: string;
  instructions: string;
  style?: Record<string, string>;
};

/**
 * Reescribe un fragmento (respuesta texto plano, sin JSON de orquestación).
 */
export async function rewriteFragmentWithOpenAI(
  input: RewriteFragmentInput
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no está definida");
  }
  const client = new OpenAI({ apiKey });
  const model =
    process.env.OPENAI_MODEL?.trim() ?? "gpt-4o-mini";

  const styleLine =
    input.style && Object.keys(input.style).length > 0
      ? `Estilo (pistas): ${JSON.stringify(input.style)}`
      : "";

  const user = [
    "Contexto ANTES del fragmento:",
    "```",
    input.context_before || "(vacío)",
    "```",
    "",
    "Fragmento a reescribir:",
    "```",
    input.fragment_text,
    "```",
    "",
    "Contexto DESPUÉS del fragmento:",
    "```",
    input.context_after || "(vacío)",
    "```",
    "",
    styleLine,
    "",
    "Instrucciones del usuario o del editor:",
    input.instructions,
    "",
    "Devuelve únicamente el texto reescrito del fragmento, sin comillas ni explicaciones.",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content:
          "Eres un editor literario profesional en español. " +
          "Respetas voz narrativa cuando el contexto la sugiere. " +
          "Respondes solo con el texto pedido.",
      },
      { role: "user", content: user },
    ],
    temperature: 0.7,
  });

  const text = response.choices[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("OpenAI devolvió reescritura vacía");
  }
  return text;
}
